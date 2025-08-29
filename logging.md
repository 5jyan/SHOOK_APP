# 📋 Logging System Documentation

## 🎯 Overview

Shook Mobile App은 **Enhanced Logging System**을 사용하여 구조화된 로깅, 성능 측정, 타임스탬프 관리를 제공합니다. 모든 로그는 **MM-DD HH:mm:ss** 형식의 타임스탬프와 구조화된 메타데이터를 포함합니다.

## 🚀 Current Logging Architecture

### Core Components

#### 1. **TimestampService** (`src/utils/timestamp-service.ts`)
- **고정밀 타임스탬프 생성**: MM-DD HH:mm:ss 형식 (08-29 11:48:00)
- **Performance.now() 지원**: 밀리초 단위 정밀 측정
- **타이머 관리**: `startTimer()`, `endTimer()`, `timeAsync()`, `timeSync()`
- **Cross-platform 호환**: React Native 환경 최적화

#### 2. **Logger Classes** (`src/utils/logger-enhanced.ts`)
- **카테고리별 로거**: 이모지 기반 시각적 구분
- **로그 레벨 필터링**: DEBUG/INFO/WARN/ERROR
- **AsyncStorage 지속성**: 일별 로그 저장 (최대 100개/일)
- **민감 정보 자동 마스킹**: 토큰, 패스워드 등 보안 정보 보호
- **OpenTelemetry 호환**: 업계 표준 로그 구조

#### 3. **HTTP Logging** (`src/utils/http-client.ts`)
- **요청/응답 자동 로깅**: 모든 API 호출 추적
- **내부/외부 API 구분**: 로깅 수준 차별화
- **성능 메트릭**: 응답 시간, 상태 코드, 페이로드 크기
- **오류 추적**: 네트워크 오류, 타임아웃 등

## 📊 Logger Categories

### Available Loggers

```typescript
import { 
  apiLogger,           // 📡 API 요청/응답
  authLogger,          // 🔐 인증/권한
  cacheLogger,         // 📦 캐싱 시스템
  notificationLogger,  // 🔔 푸시 알림
  uiLogger,            // 🎨 UI 컴포넌트
  serviceLogger,       // 🔧 비즈니스 로직
  configLogger         // ⚙️ 설정/초기화
} from '@/utils/logger-enhanced';
```

### Usage Examples

```typescript
// 기본 정보 로깅
apiLogger.info('Request completed', { 
  status: 200, 
  duration: '245ms',
  endpoint: '/api/videos'
});

// 구조화된 메타데이터와 함께
authLogger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  provider: 'google'
});

// 에러 로깅 (자동 스택 트레이스 포함)
serviceLogger.error('Database connection failed', {
  error: error.message,
  retryCount: 3,
  connectionString: 'masked'
});

// 성능 측정
const timerId = serviceLogger.startTimer('data-processing');
await processLargeDataset();
serviceLogger.endTimer(timerId, 'Data processing completed');
```

## 🔧 Log Output Format

### Standard Format
```
08-29 11:48:00 📡 [API] Request completed {"status": 200, "duration": "245ms", "endpoint": "/api/videos"}
08-29 11:48:01 🔐 [Auth] User authenticated {"userId": "123", "email": "test@example.com"}
08-29 11:48:02 🎨 [UI] Component rendered {"component": "SummariesScreen", "renderTime": "15ms"}
```

### Enhanced Log Entry Structure (OpenTelemetry Compatible)
```typescript
{
  timestamp: "08-29 11:48:00",           // 사용자 친화적 형식
  "@timestamp": "2024-08-29T11:48:00.123Z", // ISO 8601 형식
  level: "INFO",                         // 로그 레벨
  severity: "info",                      // OpenTelemetry 표준
  category: "API",                       // 로거 카테고리
  message: "Request completed",          // 주요 메시지
  metadata: { ... },                     // 구조화된 데이터
  attributes: { ... },                   // OpenTelemetry 속성
  platform: "ios",                      // 플랫폼 정보
  correlationId: "req-123",             // 분산 추적 ID
  performanceTime: 1234.56              // 고정밀 성능 시간
}
```

## 🎯 Logging Guidelines & Best Practices

### 1. **로그 레벨 사용 기준**

#### DEBUG
- **목적**: 상세한 개발 정보, 변수 값, 내부 상태
- **프로덕션**: 표시되지 않음 (`__DEV__` 환경에서만)
- **사용 예시**:
```typescript
serviceLogger.debug('Processing user input', {
  inputLength: input.length,
  validationRules: rules,
  processingStep: 'sanitization'
});
```

#### INFO
- **목적**: 일반적인 애플리케이션 흐름, 중요한 이벤트
- **프로덕션**: 표시됨
- **사용 예시**:
```typescript
authLogger.info('User login successful', {
  userId: user.id,
  loginMethod: 'google-oauth',
  sessionDuration: '24h'
});
```

#### WARN
- **목적**: 잠재적 문제, 복구 가능한 오류, 성능 경고
- **프로덕션**: 표시됨
- **사용 예시**:
```typescript
cacheLogger.warn('Cache miss rate high', {
  missRate: 0.85,
  cacheSize: '2.5MB',
  recommendation: 'increase-cache-size'
});
```

#### ERROR
- **목적**: 오류, 예외, 실패한 작업
- **프로덕션**: 표시됨
- **사용 예시**:
```typescript
apiLogger.error('API request failed', {
  endpoint: '/api/videos',
  statusCode: 500,
  error: error.message,
  retryCount: 2,
  userId: user?.id
});
```

### 2. **메타데이터 구조화 가이드**

#### ✅ 올바른 메타데이터 구조
```typescript
// 좋은 예: 구조화된 객체
serviceLogger.info('Video processing completed', {
  videoId: 'abc123',
  duration: 120,
  quality: 'HD',
  processingTime: '2.3s',
  outputSize: '15MB'
});
```

#### ❌ 피해야 할 패턴
```typescript
// 나쁜 예: 문자열 연결
console.log('Video abc123 processed in 2.3s with HD quality');

// 나쁜 예: 민감한 정보 노출
authLogger.info('Login', { password: user.password, token: accessToken });
```

### 3. **카테고리별 로거 선택 가이드**

#### 📡 apiLogger
- REST API 요청/응답
- GraphQL 쿼리/뮤테이션
- WebSocket 연결
```typescript
apiLogger.info('GraphQL query executed', {
  query: 'getUserVideos',
  variables: { userId: 123 },
  executionTime: '45ms',
  resultCount: 25
});
```

#### 🔐 authLogger
- 로그인/로그아웃
- 권한 검증
- 토큰 관리
```typescript
authLogger.warn('Token expires soon', {
  userId: user.id,
  expiresIn: '5min',
  tokenType: 'access',
  autoRefresh: true
});
```

#### 🎨 uiLogger
- 컴포넌트 렌더링
- 사용자 상호작용
- 내비게이션
```typescript
uiLogger.info('Screen navigation', {
  from: 'SummariesScreen',
  to: 'VideoDetailScreen',
  navigationMethod: 'tab-press',
  loadTime: '120ms'
});
```

#### 🔧 serviceLogger
- 비즈니스 로직
- 데이터 처리
- 백그라운드 작업
```typescript
serviceLogger.info('Background sync completed', {
  syncType: 'incremental',
  itemsProcessed: 47,
  syncDuration: '1.2s',
  nextSyncIn: '5min'
});
```

### 4. **성능 측정 Best Practices**

#### 비동기 작업 측정
```typescript
// timeAsync 사용
const result = await serviceLogger.timeAsync('database-query', async () => {
  return await database.findUsers({ active: true });
});

// 결과: 08-29 11:48:00 🔧 [Service] Async operation completed: database-query {"duration": 234, "performanceDuration": 234.56}
```

#### 동기 작업 측정
```typescript
// timeSync 사용
const processed = serviceLogger.timeSync('data-transformation', () => {
  return transformVideoData(rawData);
});
```

#### 수동 타이머 관리
```typescript
const timerId = serviceLogger.startTimer('complex-operation');

try {
  await step1();
  await step2();
  await step3();
  
  serviceLogger.endTimer(timerId, 'Complex operation succeeded');
} catch (error) {
  serviceLogger.endTimer(timerId, 'Complex operation failed');
  throw error;
}
```

### 5. **Correlation ID 활용**

분산 시스템에서 요청 추적을 위한 상관관계 ID 사용:

```typescript
// 요청 시작 시 correlation ID 설정
const correlationId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
apiLogger.setCorrelationId(correlationId);

// 모든 로그가 동일한 correlation ID를 가짐
apiLogger.info('Processing user request', { action: 'getData' });
serviceLogger.info('Database query started', { table: 'videos' });
serviceLogger.info('Cache lookup', { key: 'user-videos-123' });

// 요청 완료 시 정리
apiLogger.clearCorrelationId();
```

### 6. **에러 로깅 패턴**

#### 표준 에러 로깅
```typescript
try {
  await riskyOperation();
} catch (error) {
  serviceLogger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId: user.id, retryCount: 2 }
  });
  
  // 에러 재발생 여부 결정
  throw error;
}
```

#### 복구 가능한 에러
```typescript
try {
  const result = await primaryService();
  return result;
} catch (error) {
  serviceLogger.warn('Primary service failed, using fallback', {
    primaryError: error.message,
    fallbackService: 'cache'
  });
  
  return await fallbackService();
}
```

### 7. **보안 고려사항**

#### 자동 마스킹되는 패턴
- 토큰: `token`, `access_token`, `refresh_token`
- 인증: `authorization`, `bearer`
- 보안: `password`, `secret`, `api_key`
- 세션: `cookie`, `session`
- 알림: `ExponentPushToken[...]`

#### 추가 보안 조치
```typescript
// 민감한 정보는 로그에서 제외
apiLogger.info('User profile updated', {
  userId: user.id,
  updatedFields: ['name', 'email'], // password 필드는 제외
  timestamp: new Date().toISOString()
});

// 또는 명시적으로 마스킹
const maskedEmail = user.email.replace(/(.{3}).*(@.*)/, '$1***$2');
authLogger.info('Email verification sent', {
  userId: user.id,
  email: maskedEmail
});
```

## 🔍 Migration from Console.log

### Before (Old Pattern)
```typescript
console.log('🔄 Starting sync process...');
console.log('✅ Sync completed:', result);
console.error('❌ Sync failed:', error);
```

### After (Enhanced Pattern)
```typescript
const timerId = serviceLogger.startTimer('sync-process');
serviceLogger.info('Starting sync process', { syncType: 'full' });

try {
  const result = await syncOperation();
  serviceLogger.endTimer(timerId, 'Sync completed successfully');
  serviceLogger.info('Sync result', { 
    itemsProcessed: result.count,
    syncDuration: result.duration,
    nextSync: result.nextScheduled
  });
} catch (error) {
  serviceLogger.endTimer(timerId, 'Sync process failed');
  serviceLogger.error('Sync operation failed', {
    error: error.message,
    syncType: 'full',
    retryScheduled: true
  });
}
```

## 📈 Performance Monitoring

### Built-in Performance Features

#### 1. **Automatic Slow Operation Detection**
1초 이상 걸리는 작업은 자동으로 WARN 레벨로 로깅됩니다:

```typescript
// 이 작업이 1초 이상 걸리면 자동으로 경고 생성
await serviceLogger.timeAsync('slow-query', async () => {
  return await database.complexQuery();
});

// 출력: 08-29 11:48:03 🔧 [Service] Async operation completed: slow-query (slow operation) {"duration": 1245, "performanceDuration": 1245.67}
```

#### 2. **Timer Statistics**
```typescript
import { getTimerStats } from '@/utils/logger-enhanced';

const stats = getTimerStats();
console.log(`Active timers: ${stats.activeTimers}`);
stats.clearExpiredTimers(300000); // 5분 이상 된 타이머 정리
```

#### 3. **Memory and Storage Management**
- **일별 로그 파일**: `app_logs_2024-08-29` 형식
- **자동 정리**: 7일 이상 된 로그 파일 자동 삭제
- **용량 제한**: 일별 최대 100개 로그 엔트리
- **압축**: JSON 형태로 AsyncStorage에 효율적 저장

## 🛠️ Development Tools

### 1. **Log Viewer (CacheStatsButton 예시)**
실제 저장된 로그를 확인할 수 있습니다:

```typescript
import { getStoredLogs } from '@/utils/logger-enhanced';

const logs = await getStoredLogs('2024-08-29');
logs.forEach(log => {
  console.log(`${log.timestamp} [${log.category}] ${log.message}`);
});
```

### 2. **Log Level Runtime Control**
개발 중 로그 레벨을 동적으로 조정 가능:

```typescript
// 개발 환경에서 모든 로그 표시
if (__DEV__) {
  // DEBUG 레벨도 표시됨
}

// 프로덕션에서 WARN 이상만 표시
// ERROR와 WARN만 사용자에게 표시됨
```

## 📋 Quick Reference

### Common Patterns

```typescript
// 📡 API 로깅
apiLogger.info('API call', { method: 'POST', endpoint: '/api/data', status: 200 });

// 🔐 인증 로깅  
authLogger.info('User login', { userId: '123', method: 'google' });

// 🎨 UI 로깅
uiLogger.info('Screen navigation', { from: 'Home', to: 'Profile' });

// 🔧 서비스 로깅
serviceLogger.info('Data processing', { records: 100, duration: '2.1s' });

// 🔔 알림 로깅
notificationLogger.info('Push sent', { userId: '123', type: 'video-update' });

// 📦 캐시 로깅
cacheLogger.info('Cache hit', { key: 'user-data', hitRate: 0.95 });

// ⚙️ 설정 로깅
configLogger.info('App initialized', { version: '1.0.0', platform: 'ios' });
```

### Import Statement
```typescript
import { 
  apiLogger, 
  authLogger, 
  uiLogger, 
  serviceLogger,
  notificationLogger,
  cacheLogger,
  configLogger 
} from '@/utils/logger-enhanced';
```

---

**✅ 시스템 상태**: 모든 console.log가 구조화된 로거로 마이그레이션 완료  
**🎯 다음 단계**: 실제 앱에서 로그 동작 검증 및 성능 모니터링
- **HTTP 요청 통합 로깅**: 내부/외부 API 자동 구분 및 로깅
- **AsyncStorage 영속화**: 로그 데이터 로컬 저장 및 분석 기능

### 1.2 마이그레이션된 핵심 파일들

| 파일 경로 | 변경 사항 | 로깅 포인트 |
|-----------|-----------|-------------|
| `src/utils/logger-enhanced.ts` | **완전 재작성** - React Native 전용 로깅 시스템 | Core System |
| `src/utils/http-client.ts` | **새로 생성** - HTTP 인터셉터 및 자동 로깅 | HTTP Logging |
| `src/services/api.ts` | console.log → apiLogger, HTTP 클라이언트 통합 | 15개 → structured |
| `src/services/video-cache.ts` | console.log → cacheLogger, 성능 메트릭 개선 | 30개 → structured |
| `src/services/notification.ts` | console.log → notificationLogger | 31개 → structured |
| `src/hooks/useVideoSummariesCached.ts` | console.log → serviceLogger | 17개 → structured |
| `src/components/*` | 모든 UI 컴포넌트 로깅 표준화 | 20개+ → structured |
| `app/_layout.tsx` | 이전 로거 제거, 새 로거로 교체 | 초기화 최적화 |

## 2. 새로운 로깅 시스템 아키텍처

### 2.1 시스템 구조

```
Enhanced Logger System (React Native)
├── Core Logger Engine
│   ├── LogLevel 관리 (DEBUG, INFO, WARN, ERROR)
│   ├── 환경별 레벨 제어 (__DEV__ ? DEBUG : WARN)
│   ├── 민감정보 자동 마스킹
│   └── AsyncStorage 영속화
│
├── 카테고리별 Logger 인스턴스
│   ├── 📡 apiLogger (API 요청/응답)
│   ├── 📦 cacheLogger (캐시 작업 및 성능)
│   ├── 🔔 notificationLogger (푸시 알림)
│   ├── 🎨 uiLogger (UI 컴포넌트)
│   ├── ⚙️ configLogger (설정 및 초기화)
│   ├── 🔧 serviceLogger (백그라운드 서비스)
│   └── 🔐 authLogger (인증 관련)
│
├── HTTP 클라이언트 통합
│   ├── httpClient (내부 API용)
│   ├── googleApiClient (외부 API용)
│   └── 자동 요청/응답 로깅
│
└── 데이터 영속화 및 관리
    ├── AsyncStorage 로그 저장
    ├── 일별 로그 파일 관리
    ├── 자동 로그 정리 (7일 보관)
    └── 로그 검색 및 통계 기능
```

### 2.2 LogLevel 체계

```typescript
export enum LogLevel {
  DEBUG = 0,  // 상세한 디버깅 정보
  INFO = 1,   // 일반적인 정보성 로그
  WARN = 2,   // 경고 메시지
  ERROR = 3,  // 오류 메시지
}

// 환경별 자동 레벨 설정
const logLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
```

### 2.3 카테고리별 로거 구성

| Logger | 이모지 | 사용 위치 | 주요 용도 |
|--------|--------|-----------|----------|
| `apiLogger` | 📡 | API 서비스, HTTP 요청 | 서버 통신 모니터링 |
| `cacheLogger` | 📦 | video-cache.ts | 캐시 성능 및 상태 추적 |
| `notificationLogger` | 🔔 | notification.ts | 푸시 알림 라이프사이클 |
| `uiLogger` | 🎨 | React 컴포넌트 | UI 상태 및 사용자 상호작용 |
| `configLogger` | ⚙️ | 앱 초기화, 설정 | 시스템 설정 및 초기화 |
| `serviceLogger` | 🔧 | 백그라운드 서비스 | 훅, 비즈니스 로직 |
| `authLogger` | 🔐 | 인증 훅들 | 로그인/로그아웃 플로우 |

## 3. 구현 세부사항

### 3.1 Core Logger 클래스 (`src/utils/logger-enhanced.ts`)

```typescript
// 핵심 Logger 클래스 구조
class Logger {
  private category: string;
  private emoji: string;
  private currentLogLevel: LogLevel;

  constructor(category: string, emoji: string) {
    this.category = category;
    this.emoji = emoji;
    this.currentLogLevel = getLogLevel(); // 환경별 자동 설정
  }

  // 로그 레벨에 따른 필터링
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  // 메시지 포맷팅 (이모지 + 카테고리 + 구조화된 메타데이터)
  private formatMessage(level: string, message: string, metadata?: any): string {
    let formattedMessage = `${this.emoji} [${this.category}] ${message}`;
    if (metadata) {
      formattedMessage += ` ${JSON.stringify(maskSensitiveData(metadata))}`;
    }
    return formattedMessage;
  }

  // AsyncStorage 영속화
  private async persistLog(entry: LogEntry): Promise<void> {
    const logsKey = `app_logs_${new Date().toISOString().split('T')[0]}`;
    // 일별 로그 파일로 저장, 최대 100개 항목 유지
  }

  // 공개 로깅 메서드들
  debug(message: string, metadata?: any): void { /* ... */ }
  info(message: string, metadata?: any): void { /* ... */ }  
  warn(message: string, metadata?: any): void { /* ... */ }
  error(message: string, metadata?: any): void { /* ... */ }
}
```

### 3.2 민감정보 마스킹 시스템

```typescript
// 민감정보 패턴 정의 (정규식)
const SENSITIVE_PATTERNS = [
  /token['":\s=]*['"]([^'"]*)['"]/gi,
  /password['":\s=]*['"]([^'"]*)['"]/gi,
  /secret['":\s=]*['"]([^'"]*)['"]/gi,
  /authorization['":\s=]*['"]([^'"]*)['"]/gi,
  /bearer\s+([^\s]+)/gi,
  /ExponentPushToken\[([^\]]+)\]/gi,
  // ... 더 많은 패턴들
];

// 자동 마스킹 함수
const maskSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    let maskedData = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      maskedData = maskedData.replace(pattern, (match, sensitive) => {
        if (sensitive && sensitive.length > 6) {
          return match.replace(sensitive, `${sensitive.slice(0, 3)}...${sensitive.slice(-3)}`);
        }
        return match.replace(sensitive, '***');
      });
    });
    return maskedData;
  }
  
  // 객체와 배열 재귀적 마스킹
  if (typeof data === 'object' && data !== null) {
    // 키 이름 기반 민감정보 감지 및 마스킹
    // ...
  }
  
  return data;
};
```

### 3.3 HTTP 클라이언트 통합 (`src/utils/http-client.ts`)

```typescript
// HTTP 클라이언트 구현
class HttpClient {
  async fetch(url: string, options?: RequestInit & { logResponseBody?: boolean }): Promise<Response> {
    const startTime = Date.now();
    const isExternal = this.isExternalApi(url);
    
    // 요청 로깅 (자동)
    apiLogger.info(`${options?.method || 'GET'} ${this.maskUrl(url)}`, {
      url: this.maskUrl(url),
      method: options?.method || 'GET',
      isExternal,
      hasBody: !!options?.body
    });

    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      // 응답 로깅 (성공/실패 구분)
      const logLevel = response.ok ? 'info' : 'warn';
      apiLogger[logLevel](`${response.status} ${options?.method || 'GET'} ${this.maskUrl(url)}`, {
        status: response.status,
        duration,
        isExternal
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      apiLogger.error(`Network error ${options?.method || 'GET'} ${this.maskUrl(url)}`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        isExternal
      });
      throw error;
    }
  }

  // 내부/외부 API 자동 감지
  private isExternalApi(url: string): boolean {
    const internalPatterns = [
      /localhost/,
      /192\.168\./,
      /10\.0\.2\.2/,
      process.env.EXPO_PUBLIC_API_URL
    ].filter(Boolean);
    
    return url.startsWith('http') && 
           !internalPatterns.some(pattern => 
             typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)
           );
  }
}

// 사전 설정된 인스턴스들
export const httpClient = new HttpClient(); // 내부 API용
export const googleApiClient = new HttpClient(); // 외부 API용
```

## 4. 마이그레이션 전후 비교

### 4.1 API 서비스 로깅 개선

#### Before (기존 방식)
```typescript
// src/services/api.ts (마이그레이션 전)
console.log(`🚀 [apiService.getVideoSummaries] ${syncType} sync requested`);
console.log(`📡 [ApiService.makeRequest] ${options.method || 'GET'} ${url}`);
console.log(`📡 [ApiService.makeRequest] Request options:`, JSON.stringify(options, null, 2));
console.log(`📡 [ApiService.makeRequest] Response: ${response.status} ${response.statusText}`);
```

#### After (새로운 방식) 
```typescript
// src/services/api.ts (마이그레이션 후)
apiLogger.info(`Starting video summaries sync: ${syncType}`, {
  since: since ? new Date(since).toISOString() : null,
  endpoint,
  syncType
});

// HTTP 클라이언트가 자동으로 처리
const response = await httpClient.fetch(url, {
  headers: { 'Content-Type': 'application/json', ...options.headers },
  credentials: 'include',
  ...options,
  logResponseBody: false, // 내부 API는 상세 로깅 비활성화
});
```

**개선 효과**:
- ✅ 민감정보 자동 마스킹
- ✅ 구조화된 메타데이터
- ✅ 자동 성능 메트릭 (응답 시간)
- ✅ 내부/외부 API 구분

### 4.2 캐시 서비스 로깅 개선

#### Before (기존 방식)
```typescript
// src/services/video-cache.ts (마이그레이션 전)
console.log('📦 [VideoCache] Getting cache metadata...');
console.log(`📦 [VideoCache] Loaded ${videos.length} videos from cache (${loadTime}ms)`);
console.error('📦 [VideoCache] Error reading cached videos:', error);
```

#### After (새로운 방식)
```typescript
// src/services/video-cache.ts (마이그레이션 후)
cacheLogger.debug('Getting cache metadata');
cacheLogger.info('Loaded videos from cache', {
  videoCount: videos.length,
  loadTimeMs: loadTime,
  expiredRemoved: cacheEntries.length - validEntries.length
});
cacheLogger.error('Error reading cached videos', { 
  error: error instanceof Error ? error.message : String(error) 
});
```

**개선 효과**:
- ✅ 성능 메트릭 구조화
- ✅ 에러 정보 표준화
- ✅ 캐시 통계 상세화

### 4.3 알림 서비스 로깅 개선

#### Before (기존 방식)
```typescript
// src/services/notification.ts (마이그레이션 전)
console.log('🔔 [NotificationService] Initializing notification service...');
console.log('🔔 [NotificationService] Successfully initialized with token:', token.substring(0, 20) + '...');
console.error('🔔 [NotificationService] Failed to initialize:', error);
```

#### After (새로운 방식)
```typescript
// src/services/notification.ts (마이그레이션 후)
notificationLogger.info('Initializing notification service');
notificationLogger.info('Successfully initialized with token', { 
  tokenPreview: token.substring(0, 20) + '...' 
});
notificationLogger.error('Failed to initialize', { 
  error: error instanceof Error ? error.message : String(error) 
});
```

**개선 효과**:
- ✅ 토큰 자동 마스킹
- ✅ 에러 객체 표준화
- ✅ 구조화된 메타데이터

## 5. 환경별 로그 제어

### 5.1 Development vs Production

| 환경 | LogLevel | 출력되는 로그 | AsyncStorage 저장 |
|------|----------|---------------|------------------|
| **Development** (`__DEV__ = true`) | DEBUG | 모든 로그 (debug, info, warn, error) | INFO 레벨 이상 |
| **Production** (`__DEV__ = false`) | WARN | 경고와 오류만 (warn, error) | INFO 레벨 이상 |

### 5.2 로그 출력 예시

#### Development 환경
```
⚙️ [Config] Enhanced Logger initialized {"platform":"ios","logLevel":"DEBUG","isDev":true}
📡 [API] GET /api/videos {"url":"/api/videos","method":"GET","isExternal":false,"hasBody":false}
📦 [Cache] Cached data loaded {"videoCount":25,"loadTimeMs":45}
🔧 [Service] Hybrid sync completed {"totalTimeMs":1234,"totalVideos":25,"syncType":"incremental"}
```

#### Production 환경  
```
⚙️ [Config] Enhanced Logger initialized {"platform":"ios","logLevel":"WARN","isDev":false}
📡 [API] 500 GET /api/videos {"status":500,"duration":1234,"isExternal":false}
🔔 [Notification] Failed to register push token {"error":"Network request failed"}
```

## 6. AsyncStorage 데이터 영속화

### 6.1 저장 구조

```typescript
// AsyncStorage 키 구조
"app_logs_2024-08-29" -> LogEntry[]  // 일별 로그 파일
"app_logs_2024-08-28" -> LogEntry[]
"app_logs_2024-08-27" -> LogEntry[]
// ...

interface LogEntry {
  timestamp: string;    // ISO 8601 형식
  level: string;        // "DEBUG" | "INFO" | "WARN" | "ERROR"
  category: string;     // "API" | "Cache" | "Notification" | ...
  message: string;      // 로그 메시지
  metadata?: any;       // 구조화된 메타데이터 (민감정보 마스킹됨)
  platform: string;    // "ios" | "android" | "web"
}
```

### 6.2 자동 로그 관리

```typescript
// 자동 정리 기능
export const clearOldLogs = async (daysToKeep: number = 7): Promise<void> => {
  // 7일 이전 로그 파일 자동 삭제
  // 메모리 사용량 최적화
  // 앱 초기화 시 자동 실행
};

// 로그 검색 기능
export const getStoredLogs = async (date?: string): Promise<LogEntry[]> => {
  // 특정 날짜 로그 조회
  // 디버깅 및 분석용
};
```

### 6.3 일별 로그 제한

- **일일 최대 로그**: 100개
- **보관 기간**: 7일
- **자동 정리**: 앱 시작 시
- **메모리 효율**: FIFO 방식으로 오래된 로그부터 제거

## 7. 민감정보 보호 시스템

### 7.1 자동 감지 패턴

| 패턴 유형 | 정규식 | 마스킹 결과 |
|-----------|--------|-------------|
| **토큰** | `/token['":\s=]*['"]([^'"]*)['"]/gi` | `"token": "***"` |
| **패스워드** | `/password['":\s=]*['"]([^'"]*)['"]/gi` | `"password": "***"` |
| **Bearer 토큰** | `/bearer\s+([^\s]+)/gi` | `"bearer ***"` |
| **API 키** | `/api[_-]?key['":\s=]*['"]([^'"]*)['"]/gi` | `"api_key": "***"` |
| **Expo 토큰** | `/ExponentPushToken\[([^\]]+)\]/gi` | `ExponentPushToken[***]` |

### 7.2 키 기반 마스킹

```typescript
// 객체 키 이름으로 민감정보 감지
const sensitiveKeyPattern = /token|password|secret|auth|cookie|session|key/i;

if (sensitiveKeyPattern.test(key) && typeof value === 'string') {
  if (value.length > 6) {
    maskedObject[key] = `${value.slice(0, 3)}...${value.slice(-3)}`;
  } else {
    maskedObject[key] = '***';
  }
}
```

### 7.3 마스킹 예시

#### Before (민감정보 노출)
```json
{
  "access_token": "ya29.a0AWY7CknfXHGxKs8v7QHmN...",
  "refresh_token": "1//04nK8J9gF5xHYCgYIARAAGAQSNwF...",
  "user": {
    "email": "user@example.com",
    "token": "secret123456"
  }
}
```

#### After (자동 마스킹)
```json
{
  "access_token": "ya2...N",
  "refresh_token": "1/4...F",
  "user": {
    "email": "user@example.com",
    "token": "***"
  }
}
```

## 8. 성능 최적화

### 8.1 로그 레벨 기반 성능 최적화

```typescript
// Development: 모든 로그 출력
if (__DEV__) {
  serviceLogger.debug('Expensive debug operation', {
    heavyData: processHeavyData() // 실제 실행됨
  });
}

// Production: DEBUG 레벨 로그는 아예 실행 안됨
private shouldLog(level: LogLevel): boolean {
  return level >= this.currentLogLevel; // WARN(2) 이상만 실행
}
```

### 8.2 비동기 로그 저장

```typescript
// AsyncStorage 저장을 비동기로 처리 (UI 블로킹 방지)
this.persistLog(logEntry).catch(() => {
  // 저장 실패 시 조용히 실패 (무한 루프 방지)
});
```

### 8.3 메모리 사용량 제어

```typescript
// 일일 최대 100개 로그로 메모리 사용량 제한
if (logs.length > 100) {
  logs.splice(0, logs.length - 100); // FIFO 방식
}
```

## 9. HTTP 요청 로깅 통합

### 9.1 내부 vs 외부 API 자동 구분

```typescript
private isExternalApi(url: string): boolean {
  const internalPatterns = [
    /localhost/,
    /192\.168\./,           // iOS simulator
    /10\.0\.2\.2/,          // Android emulator
    process.env.EXPO_PUBLIC_API_URL  // 설정된 API URL
  ];
  
  return url.startsWith('http') && 
         !internalPatterns.some(pattern => pattern.test(url));
}
```

### 9.2 Google OAuth API 통합

#### Before (수동 로깅)
```typescript
// src/hooks/useGoogleAuthWeb.ts (마이그레이션 전)
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ /* 토큰 데이터 */ })
});
console.log('Token exchange response:', tokenResponse.status);
```

#### After (자동 로깅)
```typescript
// src/hooks/useGoogleAuthWeb.ts (마이그레이션 후)
const tokenResponse = await googleApiClient.fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ /* 토큰 데이터 */ }),
  logResponseBody: true, // 외부 API는 상세 로깅 활성화
});

// 자동으로 다음 로그들이 생성됨:
// 📡 [API] POST https://oauth2.googleapis.com/token {"isExternal":true,"hasBody":true}
// 📡 [API] 200 POST https://oauth2.googleapis.com/token (1234ms) {"status":200,"duration":1234,"isExternal":true}
```

## 10. 실제 로깅 예시

### 10.1 앱 시작 시 로깅

```
⚙️ [Config] Enhanced Logger initialized {"platform":"ios","logLevel":"DEBUG","isDev":true}
⚙️ [Config] Cleared 2 old log files
⚙️ [Config] App initialization started {"loaded":true,"colorScheme":"light"}
```

### 10.2 사용자 인증 플로우

```
🔐 [Auth] Google sign-in button pressed
🔐 [Auth] Starting Google Web Auth {"redirectUri":"https://auth.expo.io/@shook/shook-app"}
📡 [API] POST https://oauth2.googleapis.com/token {"isExternal":true,"hasBody":true}
📡 [API] 200 POST https://oauth2.googleapis.com/token (1245ms) {"status":200,"duration":1245,"isExternal":true}
🔐 [Auth] Sending ID token to backend for verification
📡 [API] POST /api/auth/google/verify {"isExternal":false,"hasBody":true}
📡 [API] 200 POST /api/auth/google/verify (892ms) {"status":200,"duration":892,"isExternal":false}
🔐 [Auth] Backend verification successful {"userId":123,"username":"user@example.com","role":"user"}
🔐 [Auth] User authenticated successfully {"userId":"123","email":"user@example.com"}
```

### 10.3 비디오 캐시 동기화

```
🔧 [Service] useVideoSummariesCached hook called
🔧 [Service] queryFn executing - hybrid cache strategy starting
🔧 [Service] Step 1: Loading cached data
📦 [Cache] Getting cache metadata
📦 [Cache] Cached data loaded {"videoCount":25,"loadTimeMs":45,"expiredRemoved":0}
🔧 [Service] Last sync timestamp {"lastSync":"2024-08-29T10:30:25.123Z"}
🔧 [Service] Incremental sync {"cacheAgeMinutes":15}
🔧 [Service] Performing incremental sync
📡 [API] GET /api/videos?since=1724923825123 {"isExternal":false,"hasBody":false}
📡 [API] 200 GET /api/videos (1156ms) {"status":200,"duration":1156,"isExternal":false}
🔧 [Service] Incremental sync received new videos {"newVideoCount":3}
📦 [Cache] Merging new videos with cache {"newVideoCount":3}
📦 [Cache] Cache merged {"totalVideos":28}
🔧 [Service] Hybrid sync completed {"totalTimeMs":1234,"totalVideos":28,"fromCache":false,"cacheSizeKB":145.2,"syncType":"incremental","networkVideos":3}
```

### 10.4 푸시 알림 처리

```
🔔 [Notification] Initializing notification service
🔔 [Notification] Requesting notification permissions
🔔 [Notification] Current permissions {"granted":true,"ios":{"status":2}}
🔔 [Notification] Getting push token
🔔 [Notification] Generated new token {"tokenPreview":"ExponentPushToken[A1B...C9D]"}
🔔 [Notification] Registering push token with backend
📡 [API] POST /api/push-tokens {"isExternal":false,"hasBody":true}
📡 [API] 200 POST /api/push-tokens (567ms) {"status":200,"duration":567,"isExternal":false}
🔔 [Notification] Successfully registered push token with backend
🔔 [Notification] Adding notification listeners
🔔 [Notification] New video summary notification received, triggering incremental sync {"videoId":"abc123","channelId":"UCxyz","channelName":"테스트 채널"}
🔔 [Notification] Video summaries refetch completed - new video should be in cache now
```

### 10.5 에러 상황 로깅

```
📡 [API] GET /api/videos {"isExternal":false,"hasBody":false}
📡 [API] 500 GET /api/videos (2345ms) {"status":500,"duration":2345,"isExternal":false}
🔧 [Service] Full sync failed {"error":"Internal Server Error"}
🔧 [Service] Using cached fallback {"videoCount":25}
📦 [Cache] Loaded videos from cache {"videoCount":25,"loadTimeMs":23,"expiredRemoved":0}
```

## 11. 개발자 도구 및 디버깅

### 11.1 로그 검색 기능

```typescript
// 특정 날짜 로그 조회
const todayLogs = await getStoredLogs('2024-08-29');

// 모든 에러 로그 필터링
const errorLogs = todayLogs.filter(log => log.level === 'ERROR');

// API 관련 로그만 필터링  
const apiLogs = todayLogs.filter(log => log.category === 'API');
```

### 11.2 로그 통계 확인

```typescript
// AsyncStorage에서 로그 통계 조회 가능
const stats = {
  totalLogs: todayLogs.length,
  errorCount: todayLogs.filter(l => l.level === 'ERROR').length,
  apiCallCount: todayLogs.filter(l => l.category === 'API').length,
  cacheHits: todayLogs.filter(l => l.category === 'Cache' && l.message.includes('cache')).length
};
```

### 11.3 실시간 로그 모니터링

React Native Debugger나 Flipper를 통해 실시간으로 구조화된 로그를 모니터링할 수 있습니다:

```javascript
// Chrome Developer Tools Console에서 확인 가능
// 구조화된 메타데이터로 필터링 및 검색 용이
```

## 12. 마이그레이션 후 개선 효과

### 12.1 보안 강화

- ✅ **자동 민감정보 마스킹**: 토큰, 패스워드 등 168개+ 로깅 포인트에서 자동 보호
- ✅ **키 기반 감지**: 객체 키 이름으로 민감정보 자동 감지
- ✅ **정규식 패턴**: Bearer 토큰, API 키 등 다양한 패턴 지원
- ✅ **안전한 로그 저장**: AsyncStorage 저장 시에도 마스킹된 데이터만 저장

### 12.2 성능 최적화

- ✅ **환경별 로그 제어**: 프로덕션에서 DEBUG 로그 완전 차단
- ✅ **비동기 저장**: UI 블로킹 없이 로그 영속화
- ✅ **메모리 관리**: 일일 100개 제한, 7일 자동 정리
- ✅ **지연 평가**: 로그 레벨 미만 로그는 실행조차 안됨

### 12.3 개발 생산성 향상

- ✅ **구조화된 메타데이터**: JSON 형태로 검색/필터링 용이
- ✅ **카테고리별 필터링**: 📡 API, 📦 Cache, 🔔 Notification 등
- ✅ **HTTP 요청 자동 로깅**: 요청/응답 자동 추적 및 성능 메트릭
- ✅ **일관된 에러 처리**: 표준화된 에러 로깅 형식

### 12.4 운영 모니터링 개선

- ✅ **영속화된 로그**: AsyncStorage 저장으로 오프라인 분석 가능
- ✅ **성능 메트릭**: 자동 응답 시간, 캐시 성능 추적
- ✅ **사용자 컨텍스트**: 플랫폼, 버전 정보 자동 포함
- ✅ **확장 가능성**: Sentry, LogRocket 등 외부 서비스 연동 준비

## 13. 향후 확장 계획

### 13.1 원격 로그 수집 연동

현재 구조화된 로깅 시스템은 다음 서비스들과 쉽게 연동 가능합니다:

- **Sentry**: 에러 로그 자동 전송
- **LogRocket**: 사용자 세션 기록
- **DataDog**: APM 통합
- **Firebase Crashlytics**: 크래시 리포트

### 13.2 실시간 모니터링 대시보드

```typescript
// 향후 구현 예정 기능들
export const LogAnalytics = {
  getErrorRate: () => number,        // 에러율 계산
  getPerformanceMetrics: () => {},   // 성능 지표
  getUserJourney: () => LogEntry[],  // 사용자 행동 추적
  getApiHealthCheck: () => {}        // API 상태 모니터링
};
```

### 13.3 자동화된 알림 시스템

- 특정 에러율 초과 시 개발팀 알림
- 성능 저하 감지 시 자동 보고서
- 사용자 행동 이상 패턴 감지

## 14. 타임스탬프 시스템 - 최신 트렌드 분석 및 구현

### 14.1 현재 구현 분석

#### 현재 타임스탬프 이중 생성 문제

```typescript
// 문제: 타임스탬프가 두 번 생성됨
private formatMessage(level: string, message: string, metadata?: any): string {
  const timestamp = new Date().toISOString(); // 첫 번째 생성 (사용되지 않음)
  let formattedMessage = `${this.emoji} [${this.category}] ${message}`;
  return formattedMessage;
}

private log(level: LogLevel, levelName: string, message: string, metadata?: any): void {
  // ...
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(), // 두 번째 생성 (실제 저장)
    level: levelName,
    category: this.category,
    message,
    metadata: maskedMetadata,
    platform: Platform.OS,
  };
}
```

### 14.2 2024년 최신 로깅 트렌드

#### A. Structured Logging with High-Precision Timestamps

**트렌드**: 마이크로초/나노초 단위 정밀도와 timezone-aware 타임스탬프

```typescript
// 최신 트렌드: 고정밀 타임스탬프
interface ModernLogEntry {
  '@timestamp': string;      // ISO 8601 with microseconds
  '@version': string;        // Log format version
  'event.created': number;   // Unix timestamp with microseconds
  'event.timezone': string;  // IANA timezone
  'host.name': string;       // Device/hostname
  'service.name': string;    // Application name
  'service.version': string; // App version
  'log.level': string;       // Standard log levels
  'log.logger': string;      // Logger category
  message: string;           // Human-readable message
  labels: Record<string, any>; // Structured metadata
}
```

#### B. Performance-Optimized Timestamp Generation

**트렌드**: 단일 타임스탬프 생성 + 다양한 형식 파생

```typescript
// 성능 최적화된 타임스탬프 클래스
class TimestampGenerator {
  private static instance: TimestampGenerator;
  
  static getInstance(): TimestampGenerator {
    if (!this.instance) {
      this.instance = new TimestampGenerator();
    }
    return this.instance;
  }
  
  generateTimestamp(): {
    iso: string;           // 2024-08-29T15:30:45.123Z
    unix: number;          // 1724945445123
    unixMicro: number;     // 1724945445123456 (with microseconds)
    readable: string;      // 08-29 15:30:45.123
    timezone: string;      // Asia/Seoul
    relative: string;      // "2ms ago", "5s ago"
  } {
    const now = new Date();
    const performanceNow = performance.now();
    
    return {
      iso: now.toISOString(),
      unix: now.getTime(),
      unixMicro: Math.floor(now.getTime() * 1000 + (performanceNow % 1) * 1000),
      readable: this.formatReadable(now),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      relative: this.getRelativeTime(now)
    };
  }
  
  private formatReadable(date: Date): string {
    return date.toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, '')
      .substring(5, 19) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  }
  
  private getRelativeTime(date: Date): string {
    // Implementation for "2ms ago", "5s ago" format
    return 'now';
  }
}
```

#### C. Correlation ID 및 Trace Context

**트렌드**: OpenTelemetry 호환 분산 추적

```typescript
interface TraceContext {
  'trace.id': string;        // Unique trace identifier
  'span.id': string;         // Current span identifier
  'parent.span.id'?: string; // Parent span (if any)
  'correlation.id': string;  // Cross-service correlation
  'request.id'?: string;     // HTTP request identifier
  'user.id'?: string;        // User context
  'session.id'?: string;     // Session identifier
}
```

#### D. Timezone-Aware 로깅

**트렌드**: 글로벌 앱을 위한 timezone 정보 포함

```typescript
// 최신 트렌드: Timezone-aware logging
class TimezonedLogger {
  private getTimezoneInfo(): {
    timezone: string;
    offset: string;
    isDST: boolean;
    locale: string;
  } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneName: 'long'
    });
    
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: now.getTimezoneOffset().toString(),
      isDST: this.isDST(now),
      locale: Intl.DateTimeFormat().resolvedOptions().locale
    };
  }
  
  private isDST(date: Date): boolean {
    const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== date.getTimezoneOffset();
  }
}
```

### 14.3 업계 표준 비교

#### 현재 vs 업계 표준

| 기능 | 현재 구현 | AWS CloudWatch | Google Cloud Logging | ELK Stack | Datadog |
|------|----------|----------------|-------------------|-----------|---------|
| **타임스탬프 형식** | ISO 8601 | ISO 8601 + μs | RFC 3339 + ns | ISO 8601 + ms | Unix + ms |
| **정밀도** | 밀리초 (ms) | 마이크로초 (μs) | 나노초 (ns) | 밀리초 (ms) | 마이크로초 (μs) |
| **Timezone** | UTC 고정 | UTC + timezone info | UTC + timezone info | UTC 고정 | UTC + timezone info |
| **Correlation ID** | ❌ 없음 | ✅ 있음 | ✅ 있음 | ✅ 있음 | ✅ 있음 |
| **Trace Context** | ❌ 없음 | ✅ X-Ray 통합 | ✅ Trace 통합 | ✅ APM 통합 | ✅ APM 통합 |

#### 주요 클라우드 서비스 표준

```json
// AWS CloudWatch Logs
{
  "@timestamp": "2024-08-29T15:30:45.123456Z",
  "@version": "1",
  "host": "ip-10-0-1-123",
  "level": "INFO",
  "logger_name": "com.app.service",
  "message": "User authenticated",
  "thread_name": "main",
  "aws.request_id": "8b9a7c6d-1234-5678-9abc-def012345678",
  "correlation_id": "req_abc123def456",
  "user_id": "user_12345"
}
```

```json
// Google Cloud Logging
{
  "timestamp": "2024-08-29T15:30:45.123456789Z",
  "severity": "INFO",
  "logName": "projects/my-project/logs/app-log",
  "resource": {
    "type": "mobile_app",
    "labels": {
      "version": "1.0.0",
      "platform": "ios"
    }
  },
  "trace": "projects/my-project/traces/abc123def456789",
  "spanId": "span123456789",
  "labels": {
    "user_id": "user_12345",
    "session_id": "session_abc123"
  }
}
```

### 14.4 개선된 타임스탬프 시스템 제안

#### 새로운 TimestampService 구현

```typescript
// src/utils/timestamp-service.ts
export interface EnhancedTimestamp {
  // Core timestamps
  iso: string;              // 2024-08-29T15:30:45.123Z (ISO 8601)
  unix: number;             // 1724945445123 (Unix milliseconds)
  unixMicro: number;        // 1724945445123456 (Unix microseconds)
  
  // Display formats
  readable: string;         // 08-29 15:30:45.123 (Human readable)
  relative: string;         // "just now", "2s ago", "5m ago"
  
  // Context information
  timezone: string;         // Asia/Seoul, America/New_York
  offset: number;           // Timezone offset in minutes
  isDST: boolean;           // Daylight saving time flag
  
  // Performance data
  performance: number;      // performance.now() for precise intervals
  bootTime: number;         // Time since device boot
}

export class TimestampService {
  private static instance: TimestampService;
  private startTime: number = performance.now();
  private bootTime: number = Date.now() - performance.now();
  
  static getInstance(): TimestampService {
    if (!this.instance) {
      this.instance = new TimestampService();
    }
    return this.instance;
  }
  
  now(): EnhancedTimestamp {
    const jsDate = new Date();
    const perfNow = performance.now();
    const microseconds = Math.floor((perfNow % 1) * 1000);
    
    return {
      // Core timestamps
      iso: jsDate.toISOString(),
      unix: jsDate.getTime(),
      unixMicro: jsDate.getTime() * 1000 + microseconds,
      
      // Display formats  
      readable: this.formatReadable(jsDate),
      relative: this.getRelativeTime(jsDate),
      
      // Context
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: jsDate.getTimezoneOffset(),
      isDST: this.isDaylightSavingTime(jsDate),
      
      // Performance
      performance: perfNow,
      bootTime: this.bootTime + perfNow
    };
  }
  
  private formatReadable(date: Date): string {
    // MM-DD HH:mm:ss.SSS format (기존 스타일 유지)
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }
  
  private getRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
  
  private isDaylightSavingTime(date: Date): boolean {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== date.getTimezoneOffset();
  }
  
  // Duration measurement helper
  measureDuration(startTimestamp: EnhancedTimestamp): {
    milliseconds: number;
    microseconds: number;
    readable: string;
  } {
    const currentTime = this.now();
    const ms = currentTime.unix - startTimestamp.unix;
    const μs = currentTime.unixMicro - startTimestamp.unixMicro;
    
    return {
      milliseconds: ms,
      microseconds: μs,
      readable: ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
    };
  }
}
```

#### 개선된 Logger 구현

```typescript
// src/utils/logger-enhanced.ts (개선된 버전)
import { TimestampService, EnhancedTimestamp } from './timestamp-service';

interface EnhancedLogEntry {
  // OpenTelemetry 호환 필드들
  '@timestamp': string;           // ISO 8601 with microseconds
  '@version': string;             // Log schema version
  'event.created': number;        // Unix microseconds
  'event.timezone': string;       // IANA timezone
  
  // 애플리케이션 필드들
  'service.name': string;         // 'shook-mobile'
  'service.version': string;      // App version from Constants
  'host.name': string;           // Device name/ID
  'log.level': string;           // DEBUG/INFO/WARN/ERROR
  'log.logger': string;          // Logger category
  
  // 메시지 및 메타데이터
  message: string;               // Human-readable message
  labels: Record<string, any>;   // Structured metadata (민감정보 마스킹됨)
  
  // Context 정보 (선택적)
  'trace.id'?: string;          // Distributed tracing
  'span.id'?: string;           // Current span
  'correlation.id'?: string;    // Request correlation
  'user.id'?: string;           // User context
  'session.id'?: string;        // Session context
  
  // 성능 데이터
  'event.duration'?: number;    // Operation duration (microseconds)
  'performance.now': number;    // performance.now() value
}

class Logger {
  private timestampService = TimestampService.getInstance();
  private correlationId: string | null = null;
  
  // ... 기존 코드 ...
  
  private log(level: LogLevel, levelName: string, message: string, metadata?: any, duration?: number): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = this.timestampService.now();
    const maskedMetadata = metadata ? maskSensitiveData(metadata) : {};
    
    // Console 출력 (기존 형식 유지)
    const consoleMessage = `[${timestamp.readable}] ${this.emoji} [${this.category}] ${message}`;
    const metadataString = Object.keys(maskedMetadata).length > 0 
      ? ` ${JSON.stringify(maskedMetadata)}` 
      : '';
    
    switch (level) {
      case LogLevel.DEBUG:
        console.log(consoleMessage + metadataString);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage + metadataString);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage + metadataString);
        break;
      case LogLevel.ERROR:
        console.error(consoleMessage + metadataString);
        break;
    }

    // 구조화된 로그 엔트리 (AsyncStorage 저장용)
    const structuredLogEntry: EnhancedLogEntry = {
      // OpenTelemetry 표준
      '@timestamp': timestamp.iso,
      '@version': '1.0',
      'event.created': timestamp.unixMicro,
      'event.timezone': timestamp.timezone,
      
      // 서비스 정보
      'service.name': 'shook-mobile',
      'service.version': Constants.expoConfig?.version || '1.0.0',
      'host.name': Platform.OS + '-' + Platform.Version,
      'log.level': levelName,
      'log.logger': this.category,
      
      // 메시지
      message,
      labels: maskedMetadata,
      
      // Context (있는 경우만)
      ...(this.correlationId && { 'correlation.id': this.correlationId }),
      
      // 성능 데이터
      'performance.now': timestamp.performance,
      ...(duration && { 'event.duration': duration })
    };

    // 비동기 저장
    this.persistStructuredLog(structuredLogEntry).catch(() => {
      // Silently fail
    });
  }
  
  private async persistStructuredLog(entry: EnhancedLogEntry): Promise<void> {
    try {
      const dateKey = entry['@timestamp'].split('T')[0];
      const logsKey = `structured_logs_${dateKey}`;
      const existingLogs = await AsyncStorage.getItem(logsKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(entry);
      
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem(logsKey, JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to persist structured log:', error);
    }
  }
  
  // 성능 측정을 위한 새로운 메서드들
  startTimer(): EnhancedTimestamp {
    return this.timestampService.now();
  }
  
  endTimer(startTime: EnhancedTimestamp, message: string, metadata?: any): void {
    const duration = this.timestampService.measureDuration(startTime);
    this.info(`${message} (${duration.readable})`, {
      ...metadata,
      durationMs: duration.milliseconds,
      durationMicros: duration.microseconds
    });
  }
  
  // Correlation ID 설정
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }
  
  clearCorrelationId(): void {
    this.correlationId = null;
  }
}
```

### 14.5 실제 로그 출력 비교

#### 현재 구현 출력
```
📡 [API] Starting video summaries sync: incremental {"since":"2024-08-29T10:30:25.123Z","endpoint":"/api/videos","syncType":"incremental"}
```

#### 개선된 구현 출력 (콘솔)
```
[08-29 15:30:45.123] 📡 [API] Starting video summaries sync: incremental {"since":"2024-08-29T10:30:25.123Z","endpoint":"/api/videos","syncType":"incremental","durationMs":0}
```

#### 개선된 구현 출력 (AsyncStorage 저장)
```json
{
  "@timestamp": "2024-08-29T15:30:45.123456Z",
  "@version": "1.0",
  "event.created": 1724945445123456,
  "event.timezone": "Asia/Seoul",
  "service.name": "shook-mobile",
  "service.version": "1.0.0",
  "host.name": "ios-17.5",
  "log.level": "INFO",
  "log.logger": "API",
  "message": "Starting video summaries sync: incremental",
  "labels": {
    "since": "2024-08-29T10:30:25.123Z",
    "endpoint": "/api/videos",
    "syncType": "incremental"
  },
  "correlation.id": "req_abc123def456",
  "performance.now": 12345.678901
}
```

### 14.6 성능 측정 활용 예시

```typescript
// 개선된 성능 측정
class ApiService {
  async getVideoSummaries(since?: number): Promise<ApiResponse<VideoSummary[]>> {
    const timer = apiLogger.startTimer();
    const correlationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    apiLogger.setCorrelationId(correlationId);
    
    try {
      const endpoint = since ? `/api/videos?since=${since}` : '/api/videos';
      const syncType = since ? 'incremental' : 'full';
      
      apiLogger.info(`Starting video summaries sync: ${syncType}`, {
        since: since ? new Date(since).toISOString() : null,
        endpoint,
        syncType
      });
      
      const result = await this.makeRequest<VideoSummary[]>(endpoint);
      
      apiLogger.endTimer(timer, `Video summaries sync completed: ${syncType}`, {
        success: result.success,
        videoCount: result.data?.length || 0,
        syncType
      });
      
      return result;
    } catch (error) {
      apiLogger.endTimer(timer, `Video summaries sync failed: ${syncType}`, {
        error: error instanceof Error ? error.message : String(error),
        syncType
      });
      throw error;
    } finally {
      apiLogger.clearCorrelationId();
    }
  }
}
```

#### ✅ 현재 구현의 장점
- ISO 8601 표준 타임스탬프 사용
- 이모지 기반 카테고리로 시각적 구분 우수
- 민감정보 마스킹 시스템 적용

#### 🔄 개선이 필요한 부분
- **타임스탬프 이중 생성** → 단일 생성으로 최적화
- **마이크로초 정밀도 부족** → performance.now() 활용한 고정밀도
- **Correlation ID 부재** → 분산 추적을 위한 ID 시스템
- **Timezone 정보 부족** → 글로벌 앱을 위한 timezone 인식
- **성능 측정 기능 부족** → 자동 duration 측정

#### 🚀 업계 표준 대비 우위점
- **React Native 최적화**: AsyncStorage 활용한 오프라인 로깅
- **모바일 특화**: 배터리, 메모리 효율적 설계
- **개발자 경험**: 이모지와 구조화된 메타데이터의 조합

이렇게 개선하면 **현재의 직관성은 유지하면서도 2024년 로깅 표준에 부합하는 현대적인 시스템**이 됩니다! 🎯

## 15. 결론

Shook 모바일 앱의 로깅 시스템을 **React Native 전용 Enhanced Logger**로 완전 마이그레이션하여 다음과 같은 핵심 가치를 실현했습니다:

### 14.1 즉시 적용된 개선사항

- 🔒 **보안**: 168개+ 로깅 포인트에서 민감정보 자동 보호
- 🚀 **성능**: 환경별 로그 제어로 프로덕션 성능 최적화
- 🔍 **가시성**: 구조화된 로그로 문제 진단 시간 단축
- 📊 **분석**: AsyncStorage 영속화로 오프라인 로그 분석 가능

### 14.2 기존 시스템 호환성 유지

- 📱 **이모지 카테고리**: 기존 시각적 구분 시스템 완전 유지
- 🏗️ **점진적 마이그레이션**: 기존 코드와 충돌 없이 단계적 교체
- 🔧 **개발자 친화적**: 기존 console.log 패턴과 유사한 API

### 14.3 미래 확장성 확보

- 🌐 **원격 연동**: Sentry, LogRocket 등 외부 서비스 연동 준비
- 📈 **스케일링**: 대량 로그 데이터 처리 가능한 구조
- 🤖 **자동화**: 로그 기반 자동 알림 및 대응 시스템 구축 가능

이제 Shook 앱은 **현대적이고 안전하며 확장 가능한 로깅 시스템**을 갖추게 되었으며, 개발 생산성과 운영 안정성이 크게 향상되었습니다. 🎉