# Shook App 캐시 시스템 완전 분석 문서

## 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [비디오 요약 캐시 시스템](#비디오-요약-캐시-시스템)
4. [채널 캐시 시스템](#채널-캐시-시스템)
5. [하이브리드 동기화 전략](#하이브리드-동기화-전략)
6. [데이터 무결성 및 복구](#데이터-무결성-및-복구)
7. [채널 변경 감지 메커니즘](#채널-변경-감지-메커니즘)
8. [성능 최적화](#성능-최적화)
9. [에러 처리 및 폴백](#에러-처리-및-폴백)
10. [캐시 키 구조](#캐시-키-구조)
11. [모범 사례 및 주의사항](#모범-사례-및-주의사항)

---

## 개요

Shook 앱은 YouTube 비디오 요약 정보를 효율적으로 관리하기 위해 **이중 캐시 시스템**을 사용합니다:

1. **비디오 요약 캐시** (EnhancedVideoCacheService): 30일 간 비디오 요약 데이터 캐싱
2. **채널 캐시** (ChannelCacheService): 영구 채널 정보 캐싱 (3일 동기화 주기)

두 캐시는 서로 협력하여 다음을 제공합니다:
- 즉각적인 UI 응답 (캐시된 데이터 우선 표시)
- 최소한의 네트워크 요청 (증분 동기화)
- 오프라인 지원 (캐시된 데이터로 작동)
- 데이터 일관성 보장 (ACID 트랜잭션, 자동 복구)

---

## 아키텍처

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Shook Mobile App                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         useVideoSummariesCached Hook                 │  │
│  │         (하이브리드 동기화 전략)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │                                  │
│         ┌────────────────┴────────────────┐                │
│         │                                 │                │
│  ┌──────▼──────────┐            ┌────────▼────────┐       │
│  │  비디오 요약     │            │   채널 캐시      │       │
│  │  캐시 시스템     │◄──────────►│   시스템         │       │
│  │                 │   알림      │                 │       │
│  └─────────────────┘            └─────────────────┘       │
│         │                                 │                │
│         │                                 │                │
│  ┌──────▼──────────────────────────────────▼──────────┐   │
│  │           AsyncStorage (React Native)              │   │
│  │           - 영구 저장소                             │   │
│  │           - 키-값 쌍 기반                           │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▲                                  │
│                          │                                  │
│                          ▼                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │              백엔드 API 서버                        │   │
│  │  - GET /api/videos?since={timestamp}               │   │
│  │  - GET /api/channels/{userId}                      │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 파일 구조

```
src/
├── services/
│   ├── video-cache-enhanced.ts        # 비디오 캐시 메인 서비스
│   ├── channel-cache.ts               # 채널 캐시 메인 서비스
│   ├── api.ts                         # 백엔드 API 클라이언트
│   └── cache/
│       ├── CacheTransaction.ts        # ACID 트랜잭션 시스템
│       ├── CacheValidator.ts          # 캐시 무결성 검증
│       └── CacheRecovery.ts           # 자동 복구 시스템
├── hooks/
│   ├── useVideoSummariesCached.ts     # 하이브리드 동기화 훅
│   └── useUserChannels.ts             # 채널 관리 훅
└── utils/
    ├── logger-enhanced.ts             # 구조화된 로깅
    └── http-client.ts                 # HTTP 요청 로깅
```

---

## 비디오 요약 캐시 시스템

### 1. 캐시 정책

**위치**: `src/services/video-cache-enhanced.ts`

| 설정 | 값 | 설명 |
|------|-----|------|
| `CACHE_VERSION` | `2.0.0` | 캐시 스키마 버전 |
| `MAX_CACHE_AGE` | 30일 (2,592,000,000ms) | 비디오 최대 보관 기간 |
| `MAX_ENTRIES` | 1000개 | 최대 캐시 항목 수 |
| `VALIDATION_INTERVAL` | 24시간 | 자동 검증 주기 |
| `AUTO_RECOVERY_ENABLED` | `true` | 자동 복구 활성화 |

### 2. 캐시 데이터 구조

#### CacheEntry (개별 비디오 항목)
```typescript
interface CacheEntry {
  videoId: string;           // YouTube 비디오 ID (고유 키)
  data: VideoSummary;        // 전체 비디오 요약 데이터
  cachedAt: number;          // 캐시 저장 시각 (Unix timestamp)
  channelId: string;         // 채널 ID (필터링용)
}
```

#### CacheMetadata (캐시 메타데이터)
```typescript
interface CacheMetadata {
  lastSyncTimestamp: number;   // 마지막 서버 동기화 시각
  totalVideos: number;         // 캐시된 총 비디오 수
  cacheVersion: string;        // 캐시 버전 (스키마 호환성)
  userId: number | null;       // 사용자 ID (캐시 격리)
  integrity?: {
    checksum: string;          // 데이터 무결성 체크섬
    lastValidated: number;     // 마지막 검증 시각
  };
}
```

#### VideoSummary (비디오 데이터)
```typescript
interface VideoSummary {
  videoId: string;            // YouTube 비디오 ID
  channelId: string;          // 채널 ID
  title: string;              // 비디오 제목
  publishedAt: string;        // 비디오 게시 시각 (ISO 8601)
  summary: string | null;     // AI 생성 요약 (한국어)
  transcript: string | null;  // 비디오 자막/스크립트
  processed: boolean;         // 처리 완료 여부
  errorMessage: string | null;// 처리 오류 메시지
  createdAt: string;          // 서버 처리 시각 (정렬 기준)
  channelTitle: string;       // 채널 이름
}
```

### 3. 핵심 메서드

#### getCachedVideos(): 캐시된 비디오 로드
```typescript
async getCachedVideos(): Promise<VideoSummary[]>
```

**동작 흐름**:
1. **건강성 체크**: `cacheValidator.quickHealthCheck()` 실행
   - 실패 시 → 자동 복구 시도 (`cacheRecovery.autoRecover()`)
2. **데이터 로드**: AsyncStorage에서 캐시 엔트리 읽기
3. **만료 필터링**: 30일 초과 비디오 제거
4. **유효성 검증**: 각 엔트리 구조 검증
5. **정렬**: `createdAt` 기준 최신순 정렬
6. **백그라운드 업데이트**: 만료 항목 제거 시 비동기로 캐시 갱신

**특징**:
- 빠른 실패 복구: 에러 발생 시 자동 복구 → 재시도
- 비동기 정리: 만료 항목 제거를 메인 응답에 블로킹하지 않음
- 폴백: 모든 실패 시 빈 배열 반환 (앱 크래시 방지)

#### saveVideosToCache(): 비디오 캐시 저장
```typescript
async saveVideosToCache(videos: VideoSummary[], isRetry: boolean = false): Promise<CacheOperationResult>
```

**동작 흐름**:
1. **30일 필터**: `filterRecentVideos()`로 오래된 비디오 제거
2. **크기 제한**: `MAX_ENTRIES(1000)`로 항목 수 제한
3. **트랜잭션 시작**: `CacheTransaction.begin()`
4. **원자적 저장**:
   - 비디오 데이터 저장 (`VIDEO_LIST` 키)
   - 메타데이터 업데이트 (개수, 타임스탬프, 체크섬)
5. **트랜잭션 커밋**: 성공 시 commit, 실패 시 rollback
6. **에러 복구**: 실패 시 자동 복구 → 재시도 (1회)

**반환값**:
```typescript
{
  success: boolean,          // 저장 성공 여부
  entriesProcessed: number,  // 처리된 항목 수
  errors: string[],          // 에러 메시지 배열
  recoveryApplied?: boolean  // 복구 적용 여부
}
```

#### mergeVideos(): 증분 동기화
```typescript
async mergeVideos(newVideos: VideoSummary[]): Promise<VideoSummary[]>
```

**동작 흐름**:
1. **캐시 로드**: 기존 캐시된 비디오 가져오기
2. **중복 제거 맵 생성**: `Map<videoId, VideoSummary>` 구조
3. **병합 로직**:
   - **신규 비디오**: 캐시에 없는 videoId → 추가
   - **업데이트된 비디오**: `createdAt`이 더 최신 → 교체
   - **중복 비디오**: 기존 유지
4. **정렬**: `createdAt` 기준 최신순
5. **저장**: `saveVideosToCache()` 호출

**특징**:
- 효율적인 중복 제거 (O(n) 시간 복잡도)
- 데이터 신선도 보장 (최신 `createdAt` 우선)
- 실패 시 기존 캐시 반환 (안정성)

### 4. 30일 필터링 시스템

#### 클라이언트 측 필터링
**위치**: `video-cache-enhanced.ts:898-905`

```typescript
private filterRecentVideos(videos: VideoSummary[]): VideoSummary[] {
  const cutoffDate = Date.now() - this.MAX_CACHE_AGE; // 30일 전

  return videos.filter(video => {
    const videoDate = new Date(video.createdAt).getTime();
    return videoDate >= cutoffDate;
  });
}
```

**적용 시점**:
1. `saveVideosToCache()` 진입 시 (저장 전)
2. `getCachedVideos()` 로드 시 (읽기 중)
3. `cleanOldVideos()` 수동 정리 시

#### 서버 측 필터링
**위치**: `api.ts:279-293`

```typescript
async getVideoSummaries(since?: number): Promise<ApiResponse<VideoSummary[]>> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const effectiveSince = since ? Math.max(since, thirtyDaysAgo) : thirtyDaysAgo;

  const endpoint = `/api/videos?since=${effectiveSince}`;
  // ...
}
```

**동작 원리**:
- 클라이언트가 `since` 파라미터 전달
- 서버는 `Math.max(since, 30일전)` 적용
- **결과**: 항상 최대 30일치 데이터만 반환

**예시**:
```
클라이언트 요청: since=1704067200000 (2024-01-01)
30일 전 시각:    since=1738454400000 (2025-02-01)
실제 쿼리:       since=1738454400000 (더 최신 값 선택)
```

### 5. 자동 정리 메커니즘

#### 읽기 시점 정리
**위치**: `video-cache-enhanced.ts:239-260`

```typescript
// getCachedVideos() 내부
const validEntries = cacheEntries.filter(entry => {
  const age = currentTime - entry.cachedAt;
  const isExpired = age >= this.MAX_CACHE_AGE;

  if (isExpired) {
    cacheLogger.debug('Expired entry removed', {
      videoId: entry.videoId,
      ageHours: Math.round(age / (1000 * 60 * 60))
    });
  }

  return !isExpired && isValid;
});

// 백그라운드 업데이트
if (cacheEntries.length !== validEntries.length) {
  this.backgroundUpdateCache(videos);
}
```

#### 동기화 시점 정리
**위치**: `useVideoSummariesCached.ts:117-121`

```typescript
// Step 5: Clean old videos (30+ days) periodically
const cleanedCount = await videoCacheService.cleanOldVideos();
if (cleanedCount > 0) {
  serviceLogger.info('Cleaned old videos during sync', { cleanedCount });
}
```

#### 수동 정리 API
```typescript
async cleanOldVideos(): Promise<number> {
  const cutoffDate = Date.now() - this.MAX_CACHE_AGE;
  const cachedVideos = await this.getCachedVideos();

  const recentVideos = cachedVideos.filter(video => {
    const videoDate = new Date(video.createdAt).getTime();
    return videoDate >= cutoffDate;
  });

  const deletedCount = cachedVideos.length - recentVideos.length;

  if (deletedCount > 0) {
    await this.saveVideosToCache(recentVideos);
  }

  return deletedCount;
}
```

---

## 채널 캐시 시스템

### 1. 캐시 정책

**위치**: `src/services/channel-cache.ts`

| 설정 | 값 | 설명 |
|------|-----|------|
| `CACHE_VERSION` | `1.0.0` | 캐시 스키마 버전 |
| `SYNC_INTERVAL` | 3일 (259,200,000ms) | 서버 동기화 주기 |
| `MAX_CACHE_AGE` | `Number.MAX_SAFE_INTEGER` | 영구 보관 (삭제 안함) |
| `MAX_CHANNELS` | 1000개 | 최대 채널 수 |

### 2. 캐시 데이터 구조

#### ChannelCacheEntry (개별 채널 항목)
```typescript
interface ChannelCacheEntry {
  channelId: string;         // YouTube 채널 ID
  data: UserChannel;         // 전체 채널 정보
  cachedAt: number;          // 캐시 저장 시각
  userId: number;            // 사용자 ID
}
```

#### UserChannel (사용자 구독 채널)
```typescript
interface UserChannel {
  id: number;                // 구독 ID (DB primary key)
  userId: number;            // 사용자 ID
  channelId: string;         // YouTube 채널 ID
  createdAt: string;         // 구독 시작 시각
  youtubeChannel: {
    channelId: string;
    handle: string;          // @handle
    title: string;           // 채널 이름
    description?: string;
    thumbnail?: string;      // 채널 썸네일 URL ★
    subscriberCount?: number;
    videoCount?: number;
    isActive?: boolean;
    lastRssError?: string;
    lastRssErrorAt?: string;
  };
}
```

### 3. 3일 동기화 전략

**이유**:
- 채널 정보는 자주 변경되지 않음 (썸네일, 제목 등)
- 네트워크 요청 최소화
- 배터리 및 데이터 절약

**구현**:
```typescript
async shouldSync(): Promise<boolean> {
  const lastSync = await this.getLastSyncTimestamp();

  if (lastSync === 0) {
    return true; // 첫 실행 시 동기화
  }

  const daysSinceSync = (Date.now() - lastSync) / (24 * 60 * 60 * 1000);
  return daysSinceSync >= 3;
}
```

### 4. 채널 변경 알림 시스템

**메커니즘**: 채널 목록 변경 시 비디오 캐시에 알림

```typescript
async notifyChannelChange(): Promise<void> {
  await AsyncStorage.setItem(
    'channel_list_changed',
    Date.now().toString()
  );
  cacheLogger.info('Channel change notification sent to video cache');
}
```

**트리거 시점**:
1. 채널 구독 추가/삭제 시
2. 채널 정보 실제 변경 감지 시 (`compareChannels()`)
3. 수동 강제 동기화 시 (`forceSync()`)

### 5. 채널 비교 로직

```typescript
async compareChannels(
  cachedChannels: UserChannel[],
  serverChannels: UserChannel[]
): Promise<boolean> {

  // 1. 개수 비교
  if (cachedChannels.length !== serverChannels.length) {
    return true; // 다름
  }

  // 2. 개별 채널 비교
  for (const serverChannel of serverChannels) {
    const cachedChannel = cachedChannels.find(
      c => c.channelId === serverChannel.channelId
    );

    if (!cachedChannel) {
      return true; // 새 채널
    }

    // 3. 중요 필드 비교
    if (cachedChannel.youtubeChannel.thumbnail !== serverChannel.youtubeChannel.thumbnail ||
        cachedChannel.youtubeChannel.title !== serverChannel.youtubeChannel.title) {
      return true; // 변경됨
    }
  }

  return false; // 변경 없음
}
```

**비교 대상 필드**:
- `thumbnail`: 채널 썸네일 URL (UI에 직접 영향)
- `title`: 채널 이름 (표시 정보)

---

## 하이브리드 동기화 전략

### 1. 전략 개요

**위치**: `src/hooks/useVideoSummariesCached.ts`

Shook 앱은 **Full Sync**와 **Incremental Sync**를 상황에 따라 자동 선택합니다:

```
┌─────────────────────────────────────────────────────────┐
│           하이브리드 동기화 의사결정 트리                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  사용자 변경 확인                                        │
│      ├─ YES → 캐시 전체 삭제 → Full Sync               │
│      └─ NO                                              │
│           │                                             │
│           ▼                                             │
│  채널 목록 변경 확인 (channel_list_changed 플래그)       │
│      ├─ YES → Full Sync → 플래그 초기화                │
│      └─ NO                                              │
│           │                                             │
│           ▼                                             │
│  lastSyncTimestamp 확인                                 │
│      ├─ 0 → Full Sync (첫 실행)                        │
│      └─ > 0 → Incremental Sync (since 파라미터 사용)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Full Sync (전체 동기화)

**실행 조건**:
1. 첫 실행 (`lastSyncTimestamp === 0`)
2. 채널 목록 변경 감지 (`channel_list_changed` 플래그)
3. 사용자 변경 (userId 불일치)

**동작 흐름**:
```typescript
// Step 3: Determine sync strategy
const channelListChanged = await videoCacheService.hasChannelListChanged();
const shouldFullSync = channelListChanged || lastSyncTimestamp === 0;

if (shouldFullSync) {
  // Full sync - get all videos
  serverResponse = await apiService.getVideoSummaries(); // NO 'since' parameter

  if (!serverResponse.success) {
    throw new Error(serverResponse.error);
  }

  finalVideos = serverResponse.data;

  // Replace entire cache
  await videoCacheService.saveVideosToCache(finalVideos);

  // Clear channel change signal
  if (channelListChanged) {
    await videoCacheService.clearChannelChangeSignal();
  }
}
```

**특징**:
- 백엔드 API: `GET /api/videos` (파라미터 없음)
- 서버는 최근 30일 비디오 전체 반환
- **캐시 교체**: 기존 캐시 완전 덮어쓰기
- 채널 변경 플래그 초기화

### 3. Incremental Sync (증분 동기화)

**실행 조건**:
1. Full Sync 조건 미충족
2. `lastSyncTimestamp > 0` (이전 동기화 이력 있음)

**동작 흐름**:
```typescript
else {
  // Incremental sync - get only new videos
  serverResponse = await apiService.getVideoSummaries(lastSyncTimestamp);

  if (!serverResponse.success) {
    throw new Error(serverResponse.error);
  }

  const newVideos = serverResponse.data;

  if (newVideos.length > 0) {
    // Merge new videos with cached ones
    finalVideos = await videoCacheService.mergeVideos(newVideos);
  } else {
    // No new videos, use cached data
    finalVideos = cachedVideos;

    // Update sync timestamp even if no new videos
    await videoCacheService.updateCacheMetadata({
      lastSyncTimestamp: Date.now()
    });
  }
}
```

**특징**:
- 백엔드 API: `GET /api/videos?since={lastSyncTimestamp}`
- 서버는 `since` 이후 변경된 비디오만 반환
- **캐시 병합**: `mergeVideos()` 호출 (중복 제거 + 업데이트)
- 신규 비디오 없어도 타임스탬프 갱신

### 4. 동기화 흐름 상세

**전체 프로세스** (`useVideoSummariesCached.ts:27-146`):

```typescript
// Step 1: Load cached data immediately (instant UI)
const cachedVideos = await videoCacheService.getCachedVideos();
const cacheStats = await videoCacheService.getCacheStats();

// Step 2: Get last sync timestamp
const lastSyncTimestamp = await videoCacheService.getLastSyncTimestamp();

// Step 3: Determine sync strategy
const channelListChanged = await videoCacheService.hasChannelListChanged();
const shouldFullSync = channelListChanged || lastSyncTimestamp === 0;

// Step 4: Fetch from server (Full or Incremental)
let serverResponse;
let finalVideos: VideoSummary[];

if (shouldFullSync) {
  // ... Full Sync 로직
} else {
  // ... Incremental Sync 로직
}

// Step 5: Clean old videos (30+ days)
const cleanedCount = await videoCacheService.cleanOldVideos();

// Step 6: Get updated cache stats
const updatedCacheStats = await videoCacheService.getCacheStats();

// Step 7: Return result
return {
  videos: finalVideos,
  fromCache: !shouldFullSync && serverResponse.data.length === 0,
  lastSync: Date.now(),
  cacheStats: { ... }
};
```

### 5. 폴백 전략

**에러 발생 시**:
```typescript
catch (error) {
  // Fallback: try to return cached data on error
  try {
    const fallbackVideos = await videoCacheService.getCachedVideos();
    const fallbackStats = await videoCacheService.getCacheStats();

    return {
      videos: fallbackVideos,
      fromCache: true,
      lastSync: fallbackStats.lastSync,
      cacheStats: { ... }
    };
  } catch (fallbackError) {
    throw error; // Re-throw original error
  }
}
```

**장점**:
- 네트워크 오류 시 캐시된 데이터로 계속 작동
- 사용자는 "stale but useful" 데이터 볼 수 있음
- 앱 크래시 방지

---

## 데이터 무결성 및 복구

### 1. ACID 트랜잭션 시스템

**위치**: `src/services/cache/CacheTransaction.ts`

#### 트랜잭션 생명주기

```typescript
const transaction = new CacheTransaction();

// 1. 시작
await transaction.begin();

try {
  // 2. 작업 큐잉
  await transaction.set('key1', 'value1');
  await transaction.remove('key2');
  await transaction.multiSet([['key3', 'value3'], ['key4', 'value4']]);

  // 3. 커밋 (원자적 실행)
  await transaction.commit();
} catch (error) {
  // 4. 롤백 (실패 시 복구)
  await transaction.rollback();
}
```

#### 핵심 메커니즘

**백업 생성** (`transaction.set()` 호출 시):
```typescript
async set(key: string, value: string): Promise<void> {
  // 현재 값 백업 (최초 1회만)
  if (!this.backupData.has(key)) {
    const currentValue = await AsyncStorage.getItem(key);
    this.backupData.set(key, currentValue); // null이면 null 저장
  }

  // 작업 큐에 추가
  this.operations.push({ type: 'set', key, value });
}
```

**원자적 커밋** (`transaction.commit()`):
```typescript
async commit(): Promise<void> {
  try {
    // 모든 작업 순차 실행
    for (const operation of this.operations) {
      switch (operation.type) {
        case 'set':
          await AsyncStorage.setItem(operation.key!, operation.value!);
          break;
        case 'remove':
          await AsyncStorage.removeItem(operation.key!);
          break;
        // ...
      }
    }

    this.isCommitted = true;
    await this.cleanupTransactionLog(); // 성공 시 로그 삭제
  } catch (error) {
    await this.rollback(); // 실패 시 롤백
    throw error;
  }
}
```

**롤백 복구** (`transaction.rollback()`):
```typescript
async rollback(): Promise<void> {
  const restoreOperations: [string, string][] = [];
  const removeKeys: string[] = [];

  for (const [key, originalValue] of this.backupData) {
    if (originalValue === null) {
      removeKeys.push(key); // 원래 없던 키 → 삭제
    } else {
      restoreOperations.push([key, originalValue]); // 원래 값 → 복원
    }
  }

  // 백업 데이터로 복원
  if (restoreOperations.length > 0) {
    await AsyncStorage.multiSet(restoreOperations);
  }
  if (removeKeys.length > 0) {
    await AsyncStorage.multiRemove(removeKeys);
  }

  this.isRolledBack = true;
}
```

#### 트랜잭션 로그

**목적**: 앱 비정상 종료 시 미완료 트랜잭션 복구

```typescript
private async logTransaction(status: 'pending' | 'committed' | 'rolled_back'): Promise<void> {
  const transactionLog: TransactionLog = {
    transactionId: this.transactionId,
    timestamp: Date.now(),
    operations: this.operations,
    status
  };

  const logKey = `cache_transaction_log_${this.transactionId}`;
  await AsyncStorage.setItem(logKey, JSON.stringify(transactionLog));
}
```

**복구 프로세스** (앱 시작 시):
```typescript
static async recoverIncompleteTransactions(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const transactionLogKeys = allKeys.filter(key => key.startsWith('cache_transaction_log_'));

  for (const [key, logString] of await AsyncStorage.multiGet(transactionLogKeys)) {
    const log: TransactionLog = JSON.parse(logString);
    if (log.status === 'pending') {
      // 미완료 트랜잭션 로그 삭제 (안전성 우선)
      await AsyncStorage.removeItem(key);
    }
  }
}
```

### 2. 캐시 검증 시스템

**위치**: `src/services/cache/CacheValidator.ts`

#### Quick Health Check (빠른 건강성 체크)

```typescript
async quickHealthCheck(): Promise<boolean> {
  // 1. 필수 키 존재 확인
  const keys = await AsyncStorage.getAllKeys();
  const hasVideoCache = keys.includes('video_summaries_cache');
  const hasMetadata = keys.includes('video_cache_metadata');

  // 2. 일관성 체크
  if (hasVideoCache && !hasMetadata) {
    return false; // 메타데이터 누락
  }

  // 3. 버전 호환성 체크
  const metadata = JSON.parse(await AsyncStorage.getItem('video_cache_metadata'));
  if (metadata.cacheVersion !== this.CACHE_VERSION) {
    return false; // 버전 불일치
  }

  // 4. 타임스탬프 유효성
  if (metadata.lastSyncTimestamp > Date.now() + 60000) {
    return false; // 미래 타임스탬프 (비정상)
  }

  return true;
}
```

#### Full Validation (전체 검증)

```typescript
async validateCache(): Promise<ValidationResult> {
  // 1. 메타데이터 검증
  const metadataValidation = await this.validateMetadata();

  // 2. 비디오 엔트리 검증
  const entriesValidation = await this.validateVideoEntries();

  // 3. 메타데이터-데이터 일관성 검증
  const consistencyValidation = await this.validateMetadataConsistency();

  // 4. 체크섬 무결성 검증
  const integrityValidation = await this.validateDataIntegrity();

  // 5. 결과 종합
  const criticalIssues = issues.filter(issue => issue.severity === 'critical');
  return {
    isValid: criticalIssues.length === 0,
    issues: [...모든 이슈],
    metrics: {
      validationTimeMs,
      entriesChecked,
      corruptedEntries,
      duplicateEntries,
      metadataAccuracy
    }
  };
}
```

**검증 이슈 타입**:
| 타입 | 심각도 | 설명 |
|------|--------|------|
| `metadata_mismatch` | Critical | 메타데이터-데이터 불일치 |
| `corrupted_data` | Critical | 손상된 엔트리 구조 |
| `version_mismatch` | Critical | 캐시 버전 불일치 |
| `checksum_mismatch` | Critical | 무결성 체크섬 불일치 |
| `duplicate_entry` | Warning | 중복 비디오 ID |
| `missing_entry` | Warning | 메타데이터 누락 |

#### 체크섬 계산

```typescript
calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수 변환
  }
  return Math.abs(hash).toString(16);
}
```

**사용처**:
- 메타데이터 저장 시 자동 계산
- 검증 시 현재 데이터와 비교
- 백업 무결성 확인

### 3. 자동 복구 시스템

**위치**: `src/services/cache/CacheRecovery.ts`

#### 복구 전략 결정

```typescript
async createRecoveryPlan(): Promise<RecoveryPlan> {
  const validation = await cacheValidator.validateCache();
  const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');

  let strategy: RecoveryStrategy;
  let riskLevel: 'low' | 'medium' | 'high';
  let dataLossRisk = false;

  if (criticalIssues.length === 0) {
    strategy = 'repair';           // 단순 수리
    riskLevel = 'low';
  } else if (criticalIssues.length <= 2 &&
             validation.metrics.corruptedEntries < validation.metrics.entriesChecked * 0.1) {
    strategy = 'repair';           // 타겟 수리 (10% 미만 손상)
    riskLevel = 'medium';
  } else if (validation.metrics.corruptedEntries > validation.metrics.entriesChecked * 0.5) {
    strategy = 'rebuild';          // 재구축 (50% 초과 손상)
    riskLevel = 'high';
    dataLossRisk = true;
  } else {
    strategy = 'partial_clear';    // 부분 삭제
    riskLevel = 'medium';
    dataLossRisk = true;
  }

  // 복구 액션 생성
  const actions: RecoveryAction[] = [];
  for (const issue of validation.issues) {
    switch (issue.type) {
      case 'metadata_mismatch':
        actions.push({
          type: 'repair_metadata',
          description: 'Recalculate and update metadata',
          priority: 1,
          reversible: false
        });
        break;
      case 'duplicate_entry':
        actions.push({
          type: 'remove_duplicates',
          description: 'Remove duplicate videos',
          priority: 2,
          reversible: false
        });
        break;
      // ...
    }
  }

  return { strategy, actions, estimatedTime, riskLevel, dataLossRisk };
}
```

#### 자동 복구 실행

```typescript
async autoRecover(): Promise<boolean> {
  // 1. 건강성 체크
  const isHealthy = await cacheValidator.quickHealthCheck();
  if (isHealthy) {
    return true; // 복구 불필요
  }

  // 2. 복구 계획 생성
  const plan = await this.createRecoveryPlan();

  // 3. 자동 복구 조건 확인
  if ((plan.riskLevel === 'low') ||
      (plan.riskLevel === 'medium' && !plan.dataLossRisk)) {

    // 4. 복구 실행
    const result = await this.executeRecovery(plan);

    if (result.success) {
      return true;
    } else {
      // 5. 폴백: 캐시 완전 삭제
      await this.clearCacheAsFallback();
      return true;
    }
  } else {
    // 6. 고위험 복구: 캐시 삭제
    if (plan.riskLevel === 'high') {
      await this.clearCacheAsFallback();
      return true;
    }
    return false; // 수동 개입 필요
  }
}
```

#### 복구 액션 실행

**메타데이터 수리**:
```typescript
private async repairMetadata(transaction: CacheTransaction): Promise<{ recovered: number }> {
  const cachedData = await AsyncStorage.getItem('video_summaries_cache');
  const entries = JSON.parse(cachedData);

  const newMetadata = {
    lastSyncTimestamp: Date.now(),
    totalVideos: entries.length,
    cacheVersion: this.CACHE_VERSION,
    userId: null,
    integrity: {
      checksum: cacheValidator.calculateChecksum(cachedData),
      lastValidated: Date.now()
    }
  };

  await transaction.set('video_cache_metadata', JSON.stringify(newMetadata));
  return { recovered: 1 };
}
```

**중복 제거**:
```typescript
private async removeDuplicates(transaction: CacheTransaction): Promise<{ removed: number }> {
  const entries = JSON.parse(await AsyncStorage.getItem('video_summaries_cache'));
  const seenVideoIds = new Set<string>();
  const uniqueEntries = [];
  let removedCount = 0;

  for (const entry of entries) {
    if (!seenVideoIds.has(entry.videoId)) {
      seenVideoIds.add(entry.videoId);
      uniqueEntries.push(entry);
    } else {
      removedCount++;
    }
  }

  await transaction.set('video_summaries_cache', JSON.stringify(uniqueEntries));
  return { removed: removedCount };
}
```

#### 백업 및 복원

**백업 생성**:
```typescript
async createBackup(): Promise<void> {
  const timestamp = Date.now();
  const backupKey = `cache_backup_${timestamp}`;

  const videoData = await AsyncStorage.getItem('video_summaries_cache') || '';
  const metadata = await AsyncStorage.getItem('video_cache_metadata') || '';
  const channelMapping = await AsyncStorage.getItem('channel_names_cache') || '';

  const backup: CacheBackup = {
    timestamp,
    videoData,
    metadata,
    channelMapping,
    checksum: cacheValidator.calculateChecksum(videoData + metadata + channelMapping)
  };

  await AsyncStorage.setItem(backupKey, JSON.stringify(backup));

  // 오래된 백업 삭제 (최대 3개 유지)
  await this.cleanupOldBackups();
}
```

**백업 복원**:
```typescript
async restoreFromBackup(backupTimestamp?: number): Promise<boolean> {
  // 1. 백업 찾기
  const backupKey = backupTimestamp
    ? `cache_backup_${backupTimestamp}`
    : await this.findLatestBackup();

  // 2. 백업 로드 및 무결성 확인
  const backup: CacheBackup = JSON.parse(await AsyncStorage.getItem(backupKey));
  const calculatedChecksum = cacheValidator.calculateChecksum(
    backup.videoData + backup.metadata + backup.channelMapping
  );

  if (calculatedChecksum !== backup.checksum) {
    return false; // 백업 손상
  }

  // 3. 트랜잭션으로 복원
  const transaction = new CacheTransaction();
  await transaction.begin();

  try {
    await transaction.set('video_summaries_cache', backup.videoData);
    await transaction.set('video_cache_metadata', backup.metadata);
    await transaction.set('channel_names_cache', backup.channelMapping);
    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    return false;
  }
}
```

---

## 채널 변경 감지 메커니즘

### 1. 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                     채널 변경 감지 플로우                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 사용자 액션 (채널 구독/구독 해제)                            │
│      │                                                          │
│      ▼                                                          │
│  2. 백엔드 API 호출                                             │
│      POST /api/channels (구독)                                 │
│      DELETE /api/channels/{channelId} (구독 해제)              │
│      │                                                          │
│      ▼                                                          │
│  3. 채널 캐시 갱신                                              │
│      channelCacheService.saveChannelsToCache()                 │
│      │                                                          │
│      ▼                                                          │
│  4. 채널 비교 (compareChannels)                                │
│      - 개수 비교                                                │
│      - 썸네일/제목 비교                                         │
│      │                                                          │
│      ├─ 변경 없음 → 종료 (알림 안함)                            │
│      │                                                          │
│      └─ 변경 있음                                               │
│           │                                                     │
│           ▼                                                     │
│  5. 변경 플래그 설정                                            │
│      AsyncStorage.setItem('channel_list_changed', Date.now())  │
│      │                                                          │
│      ▼                                                          │
│  6. 비디오 캐시 동기화 시 감지                                   │
│      videoCacheService.hasChannelListChanged()                 │
│      │                                                          │
│      ├─ changeTime > lastVideoSync → Full Sync 트리거          │
│      │                                                          │
│      └─ changeTime ≤ lastVideoSync → Incremental Sync         │
│           │                                                     │
│           ▼                                                     │
│  7. Full Sync 완료 후 플래그 초기화                             │
│      videoCacheService.clearChannelChangeSignal()              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 핵심 구현

#### 변경 알림 설정

**위치**: `channel-cache.ts:347-356`

```typescript
async notifyChannelChange(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      this.CHANNEL_CHANGE_KEY,  // 'channel_list_changed'
      Date.now().toString()
    );
    cacheLogger.info('Channel change notification sent to video cache');
  } catch (error) {
    cacheLogger.error('Error notifying channel change', { error });
  }
}
```

#### 변경 감지 확인

**위치**: `video-cache-enhanced.ts:819-842`

```typescript
async hasChannelListChanged(): Promise<boolean> {
  try {
    const changeSignal = await AsyncStorage.getItem(this.CHANNEL_CHANGE_KEY);
    if (!changeSignal) return false;

    const changeTime = parseInt(changeSignal);
    const lastVideoSync = await this.getLastSyncTimestamp();

    const hasChanged = changeTime > lastVideoSync;

    cacheLogger.debug('Channel change check', {
      changeTime: new Date(changeTime).toISOString(),
      lastVideoSync: new Date(lastVideoSync).toISOString(),
      hasChanged
    });

    return hasChanged;
  } catch (error) {
    cacheLogger.error('Error checking channel changes', { error });
    return false; // 에러 시 불필요한 Full Sync 방지
  }
}
```

**논리**:
```
if (changeTime > lastVideoSync) {
  // 채널 변경이 마지막 비디오 동기화 이후 발생 → Full Sync
  return true;
} else {
  // 채널 변경이 마지막 비디오 동기화 이전 → Incremental Sync
  return false;
}
```

#### 플래그 초기화

**위치**: `video-cache-enhanced.ts:847-856`

```typescript
async clearChannelChangeSignal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(this.CHANNEL_CHANGE_KEY);
    cacheLogger.debug('Channel change signal cleared');
  } catch (error) {
    cacheLogger.error('Error clearing channel change signal', { error });
  }
}
```

**호출 시점**: Full Sync 완료 직후
```typescript
// Clear channel change signal after successful full sync
if (channelListChanged) {
  await videoCacheService.clearChannelChangeSignal();
  serviceLogger.info('Channel change signal cleared after full sync');
}
```

### 3. 채널 비교 로직

**위치**: `channel-cache.ts:305-342`

```typescript
async compareChannels(
  cachedChannels: UserChannel[],
  serverChannels: UserChannel[]
): Promise<boolean> {

  // Quick check: different count
  if (cachedChannels.length !== serverChannels.length) {
    cacheLogger.info('Channel count changed', {
      cached: cachedChannels.length,
      server: serverChannels.length
    });
    return true; // Different
  }

  // Deep check: important fields
  for (const serverChannel of serverChannels) {
    const cachedChannel = cachedChannels.find(
      c => c.channelId === serverChannel.channelId
    );

    if (!cachedChannel) {
      cacheLogger.info('New channel found', {
        channelId: serverChannel.channelId
      });
      return true; // New channel
    }

    // Check if important fields changed
    if (cachedChannel.youtubeChannel.thumbnail !== serverChannel.youtubeChannel.thumbnail ||
        cachedChannel.youtubeChannel.title !== serverChannel.youtubeChannel.title) {
      cacheLogger.info('Channel data changed', {
        channelId: serverChannel.channelId,
        field: 'thumbnail or title'
      });
      return true; // Changed
    }
  }

  cacheLogger.info('No significant changes detected');
  return false; // No changes
}
```

**비교 단계**:
1. **개수 비교**: 빠른 실패 (O(1))
2. **존재 비교**: 새 채널 감지 (O(n))
3. **필드 비교**: 썸네일/제목 변경 감지 (O(n))

### 4. 통합 예시

**시나리오**: 사용자가 새 채널 구독

```typescript
// 1. API 호출 (useUserChannels.ts)
const response = await apiService.addChannel(channelId);

// 2. 채널 목록 갱신
await channelCacheService.saveChannelsToCache(updatedChannels);
  // → compareChannels() 호출
  // → 변경 감지: true
  // → notifyChannelChange() 호출
  // → AsyncStorage.setItem('channel_list_changed', Date.now())

// 3. 비디오 동기화 트리거 (useVideoSummariesCached.ts)
const channelListChanged = await videoCacheService.hasChannelListChanged();
  // → true 반환 (changeTime > lastVideoSync)

const shouldFullSync = channelListChanged || lastSyncTimestamp === 0;
  // → true

// 4. Full Sync 실행
const serverResponse = await apiService.getVideoSummaries(); // NO 'since'
await videoCacheService.saveVideosToCache(serverResponse.data);

// 5. 플래그 초기화
if (channelListChanged) {
  await videoCacheService.clearChannelChangeSignal();
    // → AsyncStorage.removeItem('channel_list_changed')
}
```

---

## 성능 최적화

### 1. 비동기 패턴

#### 병렬 로딩
```typescript
// 캐시 로드와 통계 조회 병렬 실행
const [cachedVideos, cacheStats] = await Promise.all([
  videoCacheService.getCachedVideos(),
  videoCacheService.getCacheStats()
]);
```

#### 백그라운드 업데이트
```typescript
// 메인 응답 블로킹 방지
private backgroundUpdateCache(videos: VideoSummary[]): void {
  setTimeout(() => {
    this.saveVideosToCache(videos).catch(error => {
      cacheLogger.warn('Background cache update failed', { error });
    });
  }, 100);
}
```

### 2. 효율적인 데이터 구조

#### Map 기반 중복 제거
```typescript
// O(n) 시간 복잡도
const cachedVideoMap = new Map(cachedVideos.map(v => [v.videoId, v]));

for (const newVideo of newVideos) {
  const existing = cachedVideoMap.get(newVideo.videoId);
  if (!existing) {
    actuallyNewVideos.push(newVideo);
  }
}
```

**대안 (비효율)**:
```typescript
// O(n²) 시간 복잡도 - 사용하지 말 것!
for (const newVideo of newVideos) {
  const existing = cachedVideos.find(v => v.videoId === newVideo.videoId);
  // ...
}
```

### 3. 캐시 크기 관리

#### 자동 제한
```typescript
const limitedEntries = cacheEntries.slice(0, this.MAX_ENTRIES); // 1000개

if (cacheEntries.length > this.MAX_ENTRIES) {
  cacheLogger.info('Limited cache size', {
    maxEntries: this.MAX_ENTRIES,
    originalCount: cacheEntries.length
  });
}
```

#### 30일 필터링
```typescript
// 저장 전 필터링 (서버 부담 감소)
const recentVideos = this.filterRecentVideos(videos);
await this.saveVideosToCache(recentVideos);
```

### 4. 로깅 최적화

#### 구조화된 로깅
```typescript
// 성능 타이밍
const timerId = serviceLogger.startTimer('hybrid-cache-strategy');
// ... 작업 수행
serviceLogger.endTimer(timerId, 'Hybrid sync completed');
```

#### 민감 정보 자동 마스킹
```typescript
// logger-enhanced.ts에서 자동 처리
apiLogger.info('User login', {
  token: 'secret_token_123'  // 자동으로 '***' 처리됨
});
```

### 5. TanStack Query 통합

**위치**: `useVideoSummariesCached.ts:25-180`

```typescript
const query = useQuery({
  queryKey: ['videoSummariesCached', user?.id],
  queryFn: async () => { /* 하이브리드 동기화 로직 */ },

  // 성능 최적화 설정
  staleTime: 2 * 60 * 1000,      // 2분 (캐시 있으니 짧게)
  gcTime: 10 * 60 * 1000,        // 10분
  refetchOnWindowFocus: false,   // 포커스 시 자동 갱신 비활성화
  refetchOnMount: true,          // 마운트 시 갱신
  retry: 2,                      // 재시도 2회 (폴백 있으니 짧게)
  enabled: !!user,               // 사용자 로그인 시에만 실행
});
```

---

## 에러 처리 및 폴백

### 1. 계층적 폴백 전략

```
┌─────────────────────────────────────────────────────────┐
│                   에러 처리 계층                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: 서버 API 요청 실패                            │
│      ├─ Retry 1회                                       │
│      └─ 실패 → Level 2                                  │
│                                                         │
│  Level 2: 캐시된 데이터 반환                            │
│      ├─ getCachedVideos() 호출                          │
│      └─ 실패 → Level 3                                  │
│                                                         │
│  Level 3: 자동 복구 시도                                │
│      ├─ cacheRecovery.autoRecover()                     │
│      ├─ 성공 → getCachedVideos() 재시도                 │
│      └─ 실패 → Level 4                                  │
│                                                         │
│  Level 4: 캐시 완전 삭제                                │
│      ├─ clearCacheAsFallback()                          │
│      └─ 빈 배열 반환 (앱 크래시 방지)                    │
│                                                         │
│  Level 5: 최종 폴백 (UI 레벨)                           │
│      └─ EmptyState 컴포넌트 표시                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. 구현 예시

#### API 레벨 폴백
```typescript
// api.ts
async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await httpClient.fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
    }

    return { data, success: true };
  } catch (error) {
    apiLogger.error('API request failed', {
      endpoint,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      data: null as any,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

#### 캐시 레벨 폴백
```typescript
// video-cache-enhanced.ts
async getCachedVideos(): Promise<VideoSummary[]> {
  try {
    // Quick health check
    const isHealthy = await cacheValidator.quickHealthCheck();
    if (!isHealthy) {
      const recovered = await cacheRecovery.autoRecover();
      if (!recovered) {
        cacheLogger.error('Auto-recovery failed, returning empty cache');
        return [];
      }
    }

    const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
    if (!cachedData) {
      return [];
    }

    // ... 데이터 처리
    return videos;
  } catch (error) {
    cacheLogger.error('Error reading cached videos', { error });

    // Attempt recovery
    if (this.AUTO_RECOVERY_ENABLED) {
      try {
        const recovered = await cacheRecovery.autoRecover();
        if (recovered) {
          return await this.getCachedVideos(); // Retry once
        }
      } catch (recoveryError) {
        cacheLogger.error('Recovery failed', { error: recoveryError });
      }
    }

    return [];
  }
}
```

#### Hook 레벨 폴백
```typescript
// useVideoSummariesCached.ts
catch (error) {
  serviceLogger.error('Hybrid sync error', { error });

  // Fallback: try to return cached data on error
  try {
    const fallbackVideos = await videoCacheService.getCachedVideos();
    const fallbackStats = await videoCacheService.getCacheStats();

    serviceLogger.info('Using cached fallback', { videoCount: fallbackVideos.length });

    return {
      videos: fallbackVideos,
      fromCache: true,
      lastSync: fallbackStats.lastSync,
      cacheStats: {
        totalEntries: fallbackStats.totalEntries,
        cacheSize: fallbackStats.cacheSize,
        lastSync: fallbackStats.lastSync,
      }
    };
  } catch (fallbackError) {
    serviceLogger.error('Fallback also failed', { error: fallbackError });
    throw error; // Re-throw original error
  }
}
```

### 3. 에러 로깅 전략

#### 구조화된 에러 로깅
```typescript
cacheLogger.error('Error saving to cache', {
  error: errorMsg,
  stack: errorStack,
  errorType: error instanceof Error ? error.constructor.name : typeof error,
  context: {
    videoCount: videos.length,
    operation: 'saveVideosToCache',
    userId: metadata.userId
  }
});
```

#### 에러 수집 및 분석
- AsyncStorage에 로그 저장 (`@logger:*` 키)
- 자동 로테이션 (오래된 로그 삭제)
- 에러 패턴 추적 (동일 에러 빈도 분석)

---

## 캐시 키 구조

### 1. AsyncStorage 키 맵

| 키 이름 | 용도 | 데이터 타입 | 라이프사이클 |
|---------|------|-------------|--------------|
| `video_summaries_cache` | 비디오 요약 데이터 | `CacheEntry[]` | 30일 (자동 정리) |
| `video_cache_metadata` | 비디오 캐시 메타데이터 | `CacheMetadata` | 영구 (사용자 변경 시 삭제) |
| `channel_names_cache` | (레거시) 채널 이름 매핑 | `Object` | 영구 |
| `user_channels_cache_permanent` | 채널 정보 캐시 | `ChannelCacheEntry[]` | 영구 (3일 동기화) |
| `channel_cache_metadata_permanent` | 채널 캐시 메타데이터 | `ChannelCacheMetadata` | 영구 |
| `channel_list_changed` | 채널 변경 알림 플래그 | `string (timestamp)` | Full Sync 후 삭제 |
| `cache_transaction_log_{uuid}` | 트랜잭션 로그 | `TransactionLog` | 커밋/롤백 후 삭제 |
| `cache_backup_{timestamp}` | 캐시 백업 | `CacheBackup` | 최대 3개 유지 |
| `@logger:{category}` | 로그 데이터 | `LogEntry[]` | 자동 로테이션 |

### 2. 키 네이밍 컨벤션

- **캐시 데이터**: `{domain}_{type}_cache`
  - 예: `video_summaries_cache`, `user_channels_cache_permanent`
- **메타데이터**: `{domain}_cache_metadata`
  - 예: `video_cache_metadata`, `channel_cache_metadata_permanent`
- **시스템 플래그**: `{purpose}_changed` 또는 `{domain}_{action}_flag`
  - 예: `channel_list_changed`
- **트랜잭션/백업**: `{type}_{category}_{identifier}`
  - 예: `cache_transaction_log_abc123`, `cache_backup_1704067200000`

### 3. 키 관리 전략

#### 키 충돌 방지
```typescript
// 서비스별 고유 키 프리픽스
private readonly CACHE_KEYS = {
  VIDEO_LIST: 'video_summaries_cache',       // 비디오 캐시
  METADATA: 'video_cache_metadata',           // 비디오 메타데이터
  CHANNEL_MAPPING: 'channel_names_cache',     // 채널 매핑
};

private readonly CACHE_KEYS = {
  CHANNEL_LIST: 'user_channels_cache_permanent',  // 채널 캐시
  METADATA: 'channel_cache_metadata_permanent',    // 채널 메타데이터
};
```

#### 키 정리 전략
```typescript
// 패턴별 일괄 삭제
const allKeys = await AsyncStorage.getAllKeys();

// 트랜잭션 로그 정리
const transactionLogKeys = allKeys.filter(key => key.startsWith('cache_transaction_log_'));
await AsyncStorage.multiRemove(transactionLogKeys);

// 오래된 백업 정리
const backupKeys = allKeys
  .filter(key => key.startsWith('cache_backup_'))
  .sort((a, b) => {
    const timestampA = parseInt(a.replace('cache_backup_', ''));
    const timestampB = parseInt(b.replace('cache_backup_', ''));
    return timestampB - timestampA;
  });

if (backupKeys.length > this.MAX_BACKUPS) {
  const keysToRemove = backupKeys.slice(this.MAX_BACKUPS);
  await AsyncStorage.multiRemove(keysToRemove);
}
```

---

## 모범 사례 및 주의사항

### 1. 캐시 사용 가이드

#### DO ✅

1. **항상 폴백 제공**
```typescript
try {
  const serverData = await apiService.getVideoSummaries();
  return serverData;
} catch (error) {
  const cachedData = await videoCacheService.getCachedVideos();
  return cachedData; // 사용자는 stale 데이터라도 볼 수 있음
}
```

2. **트랜잭션 사용**
```typescript
const transaction = new CacheTransaction();
await transaction.begin();

try {
  await transaction.set('key1', 'value1');
  await transaction.set('key2', 'value2');
  await transaction.commit();
} catch (error) {
  await transaction.rollback(); // 원자성 보장
}
```

3. **구조화된 로깅**
```typescript
cacheLogger.info('Operation completed', {
  operation: 'saveCache',
  videoCount: videos.length,
  cacheSizeKB: cacheSize,
  timeMs: duration
});
```

4. **검증 후 사용**
```typescript
if (this.isValidCacheEntry(entry)) {
  validEntries.push(entry);
} else {
  cacheLogger.warn('Invalid entry removed', { videoId: entry.videoId });
}
```

#### DON'T ❌

1. **AsyncStorage 직접 사용 금지**
```typescript
// ❌ 잘못된 예
await AsyncStorage.setItem('my_cache', JSON.stringify(data));

// ✅ 올바른 예
await videoCacheService.saveVideosToCache(data);
```

2. **에러 무시 금지**
```typescript
// ❌ 잘못된 예
try {
  await saveCache();
} catch (error) {
  // 에러 무시 - 절대 하지 말 것!
}

// ✅ 올바른 예
try {
  await saveCache();
} catch (error) {
  cacheLogger.error('Save failed', { error });
  // 폴백 전략 실행
  return await getFallbackData();
}
```

3. **동기화 코드 사용 금지**
```typescript
// ❌ 잘못된 예
const data = AsyncStorage.getItemSync('key'); // 존재하지 않는 메서드!

// ✅ 올바른 예
const data = await AsyncStorage.getItem('key');
```

4. **대용량 데이터 단일 키 저장 금지**
```typescript
// ❌ 잘못된 예
await AsyncStorage.setItem('all_data', JSON.stringify(hugeArray)); // 10MB+

// ✅ 올바른 예
// 페이지별 분할 저장 또는 크기 제한
const limitedData = hugeArray.slice(0, MAX_ENTRIES);
await videoCacheService.saveVideosToCache(limitedData);
```

### 2. 성능 최적화 팁

#### 배치 작업 사용
```typescript
// ❌ 느림 (N번 I/O)
for (const key of keys) {
  await AsyncStorage.removeItem(key);
}

// ✅ 빠름 (1번 I/O)
await AsyncStorage.multiRemove(keys);
```

#### 병렬 처리
```typescript
// ❌ 순차 실행 (2초 + 2초 = 4초)
const videos = await getCachedVideos();
const stats = await getCacheStats();

// ✅ 병렬 실행 (max(2초, 2초) = 2초)
const [videos, stats] = await Promise.all([
  getCachedVideos(),
  getCacheStats()
]);
```

#### 메모이제이션 (적절한 곳에서만)
```typescript
// 자주 호출되지만 변경 없는 데이터
let cachedUserChannels: UserChannel[] | null = null;
let cacheTimestamp = 0;

async getUserChannels(): Promise<UserChannel[]> {
  const now = Date.now();

  // 3일 이내 캐시 재사용
  if (cachedUserChannels && (now - cacheTimestamp) < 3 * 24 * 60 * 60 * 1000) {
    return cachedUserChannels;
  }

  cachedUserChannels = await fetchUserChannels();
  cacheTimestamp = now;
  return cachedUserChannels;
}
```

### 3. 디버깅 팁

#### 캐시 상태 확인
```typescript
// 앱 디버그 화면에 추가
const cacheStats = await videoCacheService.getCacheStats();
console.log('Cache Stats:', {
  totalEntries: cacheStats.totalEntries,
  cacheSize: `${cacheStats.cacheSize} KB`,
  lastSync: new Date(cacheStats.lastSync).toISOString(),
  validationStatus: cacheStats.validationStatus
});
```

#### 로그 조회
```typescript
// AsyncStorage에 저장된 로그 읽기
const logKeys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith('@logger:'));
const logs = await AsyncStorage.multiGet(logKeys);

logs.forEach(([key, value]) => {
  console.log(`${key}:`, JSON.parse(value || '[]'));
});
```

#### 수동 복구 실행
```typescript
// 캐시 문제 발생 시 수동 복구
const recovered = await videoCacheService.validateAndRepair();
if (recovered) {
  console.log('Cache repaired successfully');
} else {
  console.log('Manual intervention required');
}
```

### 4. 마이그레이션 가이드

#### 캐시 버전 업그레이드
```typescript
// 버전 1.0 → 2.0 마이그레이션 예시
async migrateCache(): Promise<void> {
  const metadata = await this.getCacheMetadata();

  if (metadata.cacheVersion === '1.0.0') {
    // 구 버전 캐시 읽기
    const oldCache = await AsyncStorage.getItem('old_video_cache');

    // 새 형식으로 변환
    const newCache = transformOldToNew(JSON.parse(oldCache));

    // 트랜잭션으로 마이그레이션
    const transaction = new CacheTransaction();
    await transaction.begin();

    try {
      await transaction.set('video_summaries_cache', JSON.stringify(newCache));
      await transaction.set('video_cache_metadata', JSON.stringify({
        ...metadata,
        cacheVersion: '2.0.0'
      }));
      await transaction.remove('old_video_cache');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

### 5. 테스트 전략

#### 유닛 테스트 예시
```typescript
describe('VideoCacheService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should save and retrieve videos', async () => {
    const videos: VideoSummary[] = [
      { videoId: 'v1', title: 'Test', /* ... */ }
    ];

    const result = await videoCacheService.saveVideosToCache(videos);
    expect(result.success).toBe(true);

    const cached = await videoCacheService.getCachedVideos();
    expect(cached).toHaveLength(1);
    expect(cached[0].videoId).toBe('v1');
  });

  it('should filter expired videos', async () => {
    const oldVideo: VideoSummary = {
      videoId: 'v1',
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      /* ... */
    };

    await videoCacheService.saveVideosToCache([oldVideo]);
    const cached = await videoCacheService.getCachedVideos();

    expect(cached).toHaveLength(0); // 30일 초과로 자동 제거
  });
});
```

---

## 요약

### 핵심 특징

1. **이중 캐시 시스템**
   - 비디오 요약: 30일 제한, 최대 1000개
   - 채널 정보: 영구 저장, 3일 동기화

2. **하이브리드 동기화**
   - Full Sync: 첫 실행, 채널 변경 시
   - Incremental Sync: 일반적인 경우

3. **ACID 트랜잭션**
   - 원자적 작업 보장
   - 자동 롤백 및 복구

4. **자동 복구**
   - 건강성 체크
   - 손상 감지 및 수리
   - 백업/복원

5. **채널 변경 감지**
   - 플래그 기반 알림
   - Full Sync 트리거
   - 자동 초기화

6. **다층 폴백**
   - 서버 실패 → 캐시 사용
   - 캐시 손상 → 복구 시도
   - 복구 실패 → 빈 상태 안전 처리

### 주요 파일 참조

| 파일 | 주요 책임 |
|------|----------|
| `video-cache-enhanced.ts` | 비디오 캐시 메인 로직, 30일 필터링 |
| `channel-cache.ts` | 채널 캐시 메인 로직, 3일 동기화 |
| `useVideoSummariesCached.ts` | 하이브리드 동기화 전략 |
| `CacheTransaction.ts` | ACID 트랜잭션 시스템 |
| `CacheValidator.ts` | 무결성 검증 |
| `CacheRecovery.ts` | 자동 복구 시스템 |
| `api.ts` | 백엔드 통신, 30일 서버 필터 |

---

이 문서는 Shook 앱의 캐시 시스템 전체를 망라합니다. 추가 질문이나 특정 부분에 대한 상세 설명이 필요하시면 말씀해주세요! 🚀
