# 📺 채널 탭 화면 완벽 가이드

> **YouTube 채널 구독 관리를 위한 메인 화면**  
> 사용자가 구독한 YouTube 채널들을 확인하고 관리할 수 있는 핵심 기능

---

## 🎯 화면 개요

채널 탭은 사용자가 구독한 YouTube 채널들을 시각적으로 관리할 수 있는 인터페이스입니다. 각 채널의 정보를 카드 형태로 표시하며, 직관적인 구독 취소 기능을 제공합니다.

---

## 🏗️ 전체 화면 구조

```
┌─────────────────────────────────────┐
│ SafeAreaView (전체 컨테이너)        │
│ ┌─────────────────────────────────┐ │
│ │ Header (상단 헤더)              │ │
│ │ ┌─────────────┐ ┌─────────────┐ │ │
│ │ │ 나의 채널    │ │ 🔍 검색     │ │ │
│ │ └─────────────┘ └─────────────┘ │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ChannelList (채널 목록)         │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 채널 카드 1                 │ │ │
│ │ │ ┌─────┐ ┌─────────────┐ ❤️  │ │ │
│ │ │ │ 썸네일│ │ 채널 정보    │    │ │ │
│ │ │ └─────┘ └─────────────┘    │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 채널 카드 2                 │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ ...                           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📁 파일 구조

```
app/(tabs)/channels.tsx          # 메인 채널 화면
src/components/ChannelList.tsx   # 채널 리스트 컴포넌트
src/contexts/ChannelsContext.tsx # 채널 상태 관리
```

---

## 🧩 컴포넌트 상세 분석

### 1. 📱 ChannelsScreen (메인 컨테이너)

**파일**: `app/(tabs)/channels.tsx`

#### 📋 주요 기능
- 전체 화면 레이아웃 관리
- 헤더와 채널 리스트 조합
- Pull-to-refresh 기능 연결
- 채널 검색 화면으로 네비게이션

#### 🎨 스타일링
```css
container: {
  flex: 1,                    /* 전체 화면 차지 */
  backgroundColor: '#ffffff'  /* 깨끗한 흰색 배경 */
}
```

#### 📊 상태 관리
```typescript
const [refreshing, setRefreshing] = React.useState(false);
const { refreshChannels, channelCount, isLoading } = useChannels();
```

---

### 2. 🎯 Header 컴포넌트

#### 🖼️ 시각적 구조
```
┌─────────────────────────────────────┐
│ Header (높이: 48px + 패딩)          │
│ ┌─────────────┐         ┌─────────┐ │
│ │ 나의 채널    │         │ 🔍 검색  │ │
│ │ (22px, Bold) │         │ (24px)  │ │
│ └─────────────┘         └─────────┘ │
│ ─────────────────────────────────── │ ← 구분선
└─────────────────────────────────────┘
```

#### 🎨 스타일 상세
```css
header: {
  flexDirection: 'row',          /* 가로 배치 */
  alignItems: 'center',          /* 세로 중앙 정렬 */
  justifyContent: 'space-between', /* 양쪽 끝 정렬 */
  paddingHorizontal: 16,         /* 좌우 여백 */
  paddingVertical: 12,           /* 상하 여백 */
  backgroundColor: '#ffffff',    /* 흰색 배경 */
  borderBottomWidth: 1,          /* 하단 경계선 */
  borderBottomColor: '#f1f5f9'   /* 연한 회색 경계선 */
}

headerTitle: {
  fontSize: 22,                  /* 큰 제목 크기 */
  fontWeight: 'bold',            /* 굵은 글씨 */
  color: '#111827'               /* 진한 회색 (거의 검정) */
}

searchButton: {
  padding: 8,                    /* 터치 영역 확장 */
  borderRadius: 8                /* 둥근 모서리 */
}
```

#### ⚡ 인터랙션
- **검색 버튼 터치**: `/channel-search` 화면으로 이동
- **터치 피드백**: 기본 `TouchableOpacity` 효과

---

### 3. 📋 ChannelList 컴포넌트

**파일**: `src/components/ChannelList.tsx`

#### 🖼️ 리스트 구조
```
┌─────────────────────────────────────┐
│ FlatList Container                  │
│ padding: 16px                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Channel Card 1                  │ │ ← marginBottom: 12px
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Channel Card 2                  │ │ ← marginBottom: 12px
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Channel Card 3                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 📊 데이터 처리
```typescript
interface UserChannel {
  id: string;
  youtubeChannel: {
    channelId: string;
    title: string;
    thumbnail?: string;
    subscriberCount?: string;
  };
  createdAt: string;
}
```

---

### 4. 🎴 채널 카드 (Channel Item)

#### 🖼️ 카드 레이아웃
```
┌─────────────────────────────────────────────┐
│ Channel Card (borderRadius: 12px)           │
│ padding: 16px                               │
│                                         ❤️  │ ← 하트 버튼 (absolute)
│ ┌─────────┐ ┌─────────────────────────────┐ │
│ │         │ │ 채널 제목 (16px, semibold)   │ │
│ │ 썸네일   │ │ 최대 2줄 표시               │ │
│ │ 56×56px │ ├─────────────────────────────┤ │
│ │ 원형    │ │ 구독자 1.2M (13px, 연한색)   │ │
│ │         │ ├─────────────────────────────┤ │
│ │         │ │ 2024년 1월 15일에 추가됨     │ │
│ └─────────┘ │ (11px, 연한색)              │ │
│             └─────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 🎨 카드 스타일링
```css
channelItem: {
  position: 'relative',          /* 하트 버튼 절대 위치를 위해 */
  backgroundColor: '#ffffff',    /* 흰색 배경 */
  borderRadius: 12,              /* 둥근 모서리 */
  padding: 16,                   /* 내부 여백 */
  marginBottom: 12,              /* 카드 간 간격 */
  borderWidth: 1,                /* 테두리 */
  borderColor: '#e5e7eb',        /* 연한 회색 테두리 */
  
  /* 그림자 효과 (iOS/Android 호환) */
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1                   /* Android 그림자 */
}
```

---

### 5. 🖼️ 썸네일 컴포넌트

#### 📷 실제 썸네일 (이미지 있을 때)
```css
channelThumbnail: {
  width: 56,                     /* 정사각형 기본 크기 */
  height: 56,
  borderRadius: 28,              /* 완전한 원형 (width/2) */
  marginRight: 16                /* 텍스트와의 간격 */
}
```

#### 🎭 플레이스홀더 (이미지 없을 때)
```
┌─────────────┐
│             │
│     YT      │ ← 가운데 "YT" 텍스트
│             │
└─────────────┘
```

```css
placeholderThumbnail: {
  backgroundColor: '#e5e7eb',    /* 연한 회색 배경 */
  justifyContent: 'center',      /* 세로 중앙 정렬 */
  alignItems: 'center'           /* 가로 중앙 정렬 */
}

placeholderText: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#6b7280'               /* 중간 회색 */
}
```

---

### 6. 📝 채널 정보 텍스트

#### 📊 정보 계층 구조
```
채널 제목 (16px, semibold, #111827)
├─ 최대 2줄까지 표시
├─ 긴 제목은 말줄임표(...)로 처리

구독자 수 (13px, regular, #9ca3af)
├─ "구독자 1.2M" 형태로 표시
├─ 1000 → 1K, 1000000 → 1M 변환

추가 날짜 (11px, regular, #9ca3af)
├─ "2024년 1월 15일에 추가됨"
└─ 한국어 날짜 형식 사용
```

#### 🎨 텍스트 스타일
```css
channelInfo: {
  flex: 1                        /* 남은 공간 모두 사용 */
}

channelTitle: {
  fontSize: 16,                  /* 가독성 좋은 크기 */
  fontWeight: '600',             /* 세미볼드 */
  color: '#111827',              /* 진한 회색 (메인 텍스트) */
  marginBottom: 4                /* 아래 텍스트와 간격 */
}

subscriberCount: {
  fontSize: 13,                  /* 보조 정보 크기 */
  color: '#9ca3af',              /* 연한 회색 */
  marginBottom: 2                /* 간격 */
}

addedDate: {
  fontSize: 11,                  /* 가장 작은 정보 */
  color: '#9ca3af'               /* 연한 회색 */
}
```

#### 🔢 숫자 포맷팅 로직
```typescript
const formatSubscriberCount = (count?: string): string => {
  const num = parseInt(count.replace(/[^0-9]/g, ''));
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;  // 1200000 → "1.2M"
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;     // 1200 → "1.2K"
  }
  return num.toString();                      // 999 → "999"
};
```

---

### 7. ❤️ 하트 버튼 (구독 취소)

#### 🖼️ 버튼 위치
```
┌─────────────────────────────────────┐
│ Channel Card                    ❤️  │ ← top: 8px, right: 12px
│                                     │
│ ┌─────┐ ┌─────────────────────────┐ │
│ │     │ │                         │ │
│ │     │ │                         │ │
│ └─────┘ └─────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 🎨 버튼 스타일
```css
heartButton: {
  position: 'absolute',          /* 카드 기준 절대 위치 */
  top: 8,                        /* 상단 여백 */
  right: 12,                     /* 우측 여백 */
  zIndex: 1,                     /* 다른 요소 위에 표시 */
  padding: 8                     /* 터치 영역 확장 */
}
```

#### ⚡ 인터랙션 플로우
```
1. 하트 버튼 터치
    ↓
2. Alert 다이얼로그 표시
   "채널명" 채널 구독을 취소하시겠습니까?
    ↓
3-a. "취소" 선택 → 아무 동작 없음
3-b. "구독 취소" 선택 → API 호출
    ↓
4. 로딩 상태 (버튼 비활성화)
    ↓
5-a. 성공 → 채널 목록에서 제거 + 완료 알림
5-b. 실패 → 에러 알림 표시
```

---

## 🎨 색상 시스템 & 디자인 토큰

### 🌈 컬러 팔레트
```css
/* 텍스트 색상 */
--text-primary: #111827      /* 메인 텍스트 (거의 검정) */
--text-secondary: #6b7280    /* 보조 텍스트 (중간 회색) */
--text-tertiary: #9ca3af     /* 부가 정보 (연한 회색) */

/* 배경 색상 */
--bg-primary: #ffffff        /* 메인 배경 (흰색) */
--bg-secondary: #f9fafb      /* 보조 배경 (매우 연한 회색) */

/* 경계선 색상 */
--border-light: #f1f5f9      /* 연한 구분선 */
--border-normal: #e5e7eb     /* 일반 경계선 */

/* 액센트 색상 */
--accent-red: #ef4444        /* 하트 버튼 (빨간색) */
--accent-blue: #4285f4       /* 버튼, 로딩 (구글 블루) */
--accent-error: #dc2626      /* 에러 메시지 (빨간색) */
```

### 📏 간격 시스템
```css
/* 패딩/마진 */
--space-xs: 2px      /* 텍스트 줄 간격 */
--space-sm: 4px      /* 작은 간격 */
--space-md: 8px      /* 버튼 패딩 */
--space-lg: 12px     /* 카드 간격, 세로 패딩 */
--space-xl: 16px     /* 화면 패딩, 카드 내부 */
--space-2xl: 32px    /* 빈 상태 패딩 */

/* 테두리 반지름 */
--radius-sm: 8px     /* 버튼 */
--radius-md: 12px    /* 카드 */
--radius-full: 50%   /* 원형 (썸네일) */
```

### 🔤 타이포그래피
```css
/* 폰트 크기 */
--text-xs: 11px      /* 추가 날짜 */
--text-sm: 13px      /* 구독자 수 */
--text-base: 16px    /* 채널 제목 */
--text-lg: 22px      /* 헤더 제목 */

/* 폰트 굵기 */
--font-normal: 400   /* 일반 텍스트 */
--font-semibold: 600 /* 강조 텍스트 */
--font-bold: 700     /* 제목 */
```

---

## 🔄 상태별 UI 패턴

### 1. 📥 로딩 상태
```
┌─────────────────────────────────────┐
│                                     │
│              ⟳ 로딩중                │
│                                     │
│        채널 목록을 불러오는 중...      │
│                                     │
└─────────────────────────────────────┘
```

### 2. ❌ 에러 상태
```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️ 오류 메시지                │
│                                     │
│         ┌─────────────┐             │
│         │ 다시 시도    │             │
│         └─────────────┘             │
└─────────────────────────────────────┘
```

### 3. 📭 빈 상태 (채널 없음)
```
┌─────────────────────────────────────┐
│                                     │
│      구독 중인 채널이 없습니다         │
│                                     │
│   위의 검색 기능을 사용하여 YouTube   │
│        채널을 추가해보세요.           │
│                                     │
└─────────────────────────────────────┘
```

---

## ⚡ 인터랙션 & 애니메이션

### 🎭 터치 피드백
- **하트 버튼**: `activeOpacity={0.6}` (60% 투명도)
- **검색 버튼**: 기본 `TouchableOpacity` 효과
- **재시도 버튼**: 기본 터치 효과

### 🔄 Pull-to-Refresh
```typescript
<RefreshControl 
  refreshing={refreshing} 
  onRefresh={handleRefresh} 
/>
```
- iOS: 네이티브 스타일 새로고침
- Android: Material Design 스타일

### ⏱️ 로딩 애니메이션
- **ActivityIndicator**: 구글 블루 색상
- **크기**: `large` (플랫폼별 자동 조정)

---

## 🔧 최적화 & 성능

### 📱 FlatList 최적화
```typescript
<FlatList
  data={channels}
  renderItem={renderChannelItem}
  keyExtractor={(item) => item?.id?.toString() || `channel-${Date.now()}-${Math.random()}`}
  showsVerticalScrollIndicator={false}     // 스크롤바 숨김
  contentContainerStyle={styles.listContainer}
  refreshControl={refreshControl}
/>
```

### 🖼️ 이미지 최적화
```typescript
<Image
  source={{ uri: item.youtubeChannel.thumbnail }}
  style={styles.channelThumbnail}
  resizeMode="cover"                       // 비율 유지하며 크롭
/>
```

### 📝 텍스트 최적화
```typescript
<Text style={styles.channelTitle} numberOfLines={2}>
  {item.youtubeChannel.title || '제목 없음'}
</Text>
```

---

## 🐛 에러 처리 & 예외 상황

### 🛡️ 데이터 검증
```typescript
// Safety check for item and required properties
if (!item || !item.youtubeChannel) {
  console.warn('Invalid channel item:', item);
  return null;
}
```

### 🔄 API 에러 처리
```typescript
try {
  await deleteChannel(channel.youtubeChannel.channelId);
  // 성공 처리
} catch (err) {
  Alert.alert(
    '구독 취소 실패', 
    err instanceof Error ? err.message : '채널 구독 취소 중 오류가 발생했습니다.'
  );
}
```

### 📊 캐시 무효화
```typescript
// 채널 삭제 후 관련 데이터 새로고침
queryClient.invalidateQueries({ queryKey: ['videoSummariesCached'] });
```

---

## 🎯 접근성 (Accessibility)

### 🏷️ 의미적 구조
- `SafeAreaView`: 시스템 UI 영역 회피
- 명확한 텍스트 계층 구조
- 적절한 색상 대비율 유지

### 👆 터치 영역
- **최소 터치 영역**: 44×44pt (iOS 가이드라인)
- **하트 버튼**: padding으로 터치 영역 확장
- **검색 버튼**: padding으로 터치 영역 확장

### 🔤 폰트 크기
- **시스템 폰트 사용**: 사용자 설정 존중
- **명확한 크기 차이**: 정보 계층 구분

---

## 📱 반응형 디자인

### 📐 레이아웃 적응
- `flex: 1` 사용으로 다양한 화면 크기 대응
- 고정 크기와 유연한 크기의 적절한 조합
- 안전 영역 고려한 레이아웃

### 🖼️ 이미지 처리
- 썸네일 고정 크기 (56×56px)
- `resizeMode="cover"`로 비율 유지
- 플레이스홀더로 빈 상태 처리

---

## 🔮 미래 개선 방안

### 🎨 UI/UX 개선
- [ ] 스켈레톤 로딩 애니메이션
- [ ] 스와이프 제스처로 구독 취소
- [ ] 채널 카드 터치 시 상세 정보
- [ ] 다크 모드 지원

### ⚡ 성능 개선
- [ ] 가상화된 리스트 (대량 데이터)
- [ ] 이미지 레이지 로딩
- [ ] 메모화된 컴포넌트

### 🔧 기능 확장
- [ ] 채널 정렬 옵션
- [ ] 채널 그룹화/카테고리
- [ ] 즐겨찾기 기능
- [ ] 검색 필터링

---

## 📚 관련 파일 참조

```
app/(tabs)/channels.tsx                    # 메인 화면
src/components/ChannelList.tsx             # 채널 리스트
src/components/ui/IconSymbol.tsx          # 아이콘 컴포넌트
src/contexts/ChannelsContext.tsx          # 상태 관리
src/services/api.ts                       # API 호출
```

---

*이 문서는 채널 탭 화면의 모든 구성 요소와 동작 방식을 상세히 설명합니다. 개발자가 코드를 이해하고 유지보수할 때 참고용으로 활용하세요.*