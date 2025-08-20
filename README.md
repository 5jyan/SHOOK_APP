# 📱 Shook Mobile App

YouTube 채널 모니터링과 AI 기반 요약을 제공하는 React Native 모바일 애플리케이션

## 🌟 주요 기능

- **🔍 YouTube 채널 구독** - 최대 3개 채널 모니터링
- **🤖 AI 요약 생성** - 신규 영상 자동 요약 (한국어)
- **📱 푸시 알림** - 새 영상 업로드 즉시 알림
- **💾 스마트 캐싱** - 오프라인에서도 이전 요약 확인
- **🔄 실시간 동기화** - 백엔드와 증분 동기화
- **🌐 크로스 플랫폼** - iOS, Android 동시 지원

## 🛠 기술 스택

### 핵심 프레임워크
- **React Native** `0.79.5` + **React** `19.0.0`
- **Expo SDK** `53` (managed workflow)
- **TypeScript** `5.8.3` (엄격한 타입 체킹)
- **Expo Router** `5.1.4` (파일 기반 라우팅)

### 상태 관리
- **Zustand** `5.0.7` + **Immer** `10.1.1` (전역 상태)
- **TanStack Query** `5.84.2` (서버 상태)
- **AsyncStorage** `2.1.2` (로컬 캐시)
- **Expo SecureStore** `14.2.3` (보안 저장)

### UI & 스타일링
- **NativeWind** `2.0.11` (Tailwind CSS for RN)
- **Expo Image** `2.4.0` (최적화된 이미지)
- **React Native Reanimated** `3.17.4` (애니메이션)
- **React Hook Form** `7.62.0` + **Zod** `4.0.16` (폼 검증)

### 인증 & 외부 서비스
- **Google Sign-In** `15.0.0` (OAuth 2.0)
- **Expo AuthSession** `6.2.1` (인증 세션)
- **Expo Notifications** `0.31.4` (푸시 알림)

## 📂 프로젝트 구조

```
shook_app/
├── app/                           # Expo Router 기반 라우팅
│   ├── (tabs)/                   # 탭 네비게이션
│   │   ├── _layout.tsx          # 탭 레이아웃
│   │   ├── index.tsx            # 홈 화면
│   │   ├── channels.tsx         # 채널 관리 탭
│   │   ├── summaries.tsx        # 요약 목록 탭
│   │   └── settings.tsx         # 설정 탭
│   ├── _layout.tsx              # 루트 레이아웃
│   ├── auth.tsx                 # 로그인 화면
│   ├── auth-complex.tsx         # 복잡한 인증 플로우
│   └── summary-detail.tsx       # 요약 상세 화면
├── src/
│   ├── components/              # 재사용 가능한 컴포넌트
│   │   ├── ui/                  # 기본 UI 컴포넌트
│   │   ├── SummaryCard.tsx      # 요약 카드
│   │   ├── ChannelList.tsx      # 채널 목록
│   │   ├── EmptyState.tsx       # 빈 상태 화면
│   │   └── GoogleSignInButton.tsx # Google 로그인 버튼
│   ├── hooks/                   # 커스텀 React 훅
│   │   ├── useVideoSummariesCached.ts # 캐싱된 비디오 요약
│   │   ├── useUserChannels.ts   # 사용자 채널 관리
│   │   ├── useGoogleAuth*.ts    # Google 인증 (여러 구현)
│   │   └── useChannelSearch.ts  # 채널 검색
│   ├── services/                # 외부 서비스 & API
│   │   ├── api.ts              # 백엔드 API 서비스
│   │   ├── notification.ts     # 푸시 알림 서비스
│   │   ├── video-cache.ts      # 비디오 캐시 서비스
│   │   └── google-auth*.ts     # Google 인증 서비스
│   ├── stores/                  # Zustand 상태 관리
│   │   ├── auth-store.ts       # 인증 상태
│   │   └── notification-store.ts # 알림 상태
│   ├── contexts/                # React Context
│   │   └── ChannelsContext.tsx  # 채널 데이터 컨텍스트
│   ├── lib/                     # 유틸리티 & 설정
│   │   ├── query-client.ts     # TanStack Query 설정
│   │   ├── storage.ts          # 저장소 추상화
│   │   └── utils.ts            # 공통 유틸리티
│   └── utils/                   # 유틸리티 함수
│       └── html-decode.ts      # HTML 엔티티 디코딩
└── assets/                      # 정적 자산
    ├── images/                  # 이미지 파일
    └── fonts/                   # 폰트 파일
```

## 🚀 시작하기

### 필요 조건

- **Node.js** 18+ 
- **npm** 또는 **yarn**
- **Expo CLI** `@expo/cli`
- **Android Studio** (Android 개발용)
- **Xcode** (iOS 개발용, macOS만)

### 설치

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   ```bash
   cp .env.example .env
   ```
   
   `.env` 파일에 다음 값들을 설정:
   ```env
   # Google OAuth 설정
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
   
   # API 서버 URL
   EXPO_PUBLIC_API_URL=http://192.168.0.156:3000
   EXPO_PUBLIC_API_URL_PRODUCTION=https://your-api-domain.com
   
   # 앱 스키마
   EXPO_PUBLIC_APP_SCHEME=com.shook.app
   ```

### 개발 서버 실행

```bash
# Expo 개발 서버 시작 (포트 19003)
npm start
# 또는
npx expo start
# 또는 wifi 없이 tunnel 모드로 실행
npx expo start --tunnel

# 특정 플랫폼에서 실행
npm run android     # Android 에뮬레이터/기기에서 실행
npm run ios        # iOS 시뮬레이터/기기에서 실행 (macOS만)
npm run web        # 웹 브라우저에서 실행
```

### 코드 품질 검사

```bash
# ESLint 실행
npm run lint

# TypeScript 타입 체크
npx tsc --noEmit
```

## 🏗 아키텍처

### 인증 시스템

**Google OAuth 2.0 플로우:**
1. **Google Sign-In** 버튼 클릭
2. **Expo AuthSession**을 통한 OAuth 요청
3. **Google ID 토큰** 수신
4. **백엔드 검증** (`/api/auth/google/mobile/verify`)
5. **사용자 정보 저장** (Secure Store)
6. **푸시 알림 토큰 등록**

```typescript
// 인증 상태 관리 (Zustand + Immer)
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

### 데이터 관리 & 캐싱

**하이브리드 캐싱 전략:**

```typescript
// 증분 동기화 로직
const cacheAge = Date.now() - lastSyncTimestamp;
const FULL_SYNC_THRESHOLD = 24 * 60 * 60 * 1000; // 24시간
const shouldFullSync = cacheAge > FULL_SYNC_THRESHOLD;

if (shouldFullSync) {
  // 전체 동기화 - 모든 비디오 가져오기
  const response = await apiService.getVideoSummaries();
  await videoCacheService.saveVideosToCache(response.data);
} else {
  // 증분 동기화 - 새로운 비디오만 가져오기
  const response = await apiService.getVideoSummaries(lastSyncTimestamp);
  const mergedVideos = await videoCacheService.mergeVideos(response.data);
}
```

**캐시 구조:**
```typescript
interface CacheEntry {
  videoId: string;
  data: VideoSummary;
  cachedAt: number;
  channelId: string;
}

interface CacheMetadata {
  lastSyncTimestamp: number;
  totalVideos: number;
  cacheVersion: string;
  userId: number | null;
}
```

### 푸시 알림 시스템

**알림 처리 플로우:**
1. **백엔드에서 새 비디오 감지** (5분 간격 모니터링)
2. **푸시 알림 전송** (Expo Push Service)
3. **앱에서 알림 수신** 시 자동 동기화 트리거
4. **TanStack Query 캐시 무효화**
5. **UI 자동 업데이트**

```typescript
// 알림 수신 시 자동 데이터 동기화
const notificationListener = Notifications.addNotificationReceivedListener(notification => {
  if (notification.request.content.data?.type === 'new_video_summary') {
    // 증분 동기화 트리거
    queryClient.refetchQueries({
      queryKey: ['videoSummariesCached']
    });
  }
});
```

### 상태 관리

**전역 상태 (Zustand + Immer):**
- **인증 상태** - 사용자 정보, 로그인 상태
- **알림 상태** - 푸시 알림 등록 상태

**서버 상태 (TanStack Query):**
- **비디오 요약** - 캐싱, 백그라운드 업데이트
- **사용자 채널** - 구독 채널 목록
- **채널 검색** - YouTube 채널 검색 결과

**로컬 상태 (AsyncStorage):**
- **비디오 캐시** - 오프라인 액세스를 위한 영구 캐시
- **캐시 메타데이터** - 동기화 타임스탬프, 통계

## 🔌 백엔드 통합

### API 엔드포인트

**인증:**
- `POST /api/auth/google/mobile/verify` - Google ID 토큰 검증
- `POST /api/auth/logout` - 로그아웃

**채널 관리:**
- `GET /api/channels/user` - 사용자 구독 채널 목록
- `GET /api/channels/search?q={query}` - YouTube 채널 검색
- `POST /api/channels` - 채널 구독 추가
- `DELETE /api/channels/{channelId}` - 채널 구독 해제

**비디오 요약:**
- `GET /api/videos` - 전체 비디오 요약 목록
- `GET /api/videos?since={timestamp}` - 증분 동기화용

**푸시 알림:**
- `POST /api/push/register` - 푸시 토큰 등록
- `DELETE /api/push/unregister` - 푸시 토큰 해제

### 세션 관리

```typescript
// 쿠키 기반 세션 인증
const response = await fetch(url, {
  credentials: 'include', // 세션 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  }
});
```

## 📱 주요 화면

### 1. 채널 탭 (`app/(tabs)/channels.tsx`)
- **YouTube 채널 검색** (실시간 디바운싱)
- **채널 구독 관리** (최대 3개 제한)
- **구독 상태 표시** (썸네일, 제목, 구독자 수)

### 2. 요약 탭 (`app/(tabs)/summaries.tsx`)
- **AI 요약 목록** (시간순 정렬)
- **채널 썸네일** 표시 (실제 채널 이미지)
- **풀 투 리프레시** (수동 동기화)
- **탭 포커스** 시 자동 동기화

### 3. 설정 탭 (`app/(tabs)/settings.tsx`)
- **사용자 프로필** 정보
- **Google 계정** 연동 상태
- **푸시 알림** 설정
- **캐시 통계** 및 관리

### 4. 요약 상세 (`app/summary-detail.tsx`)
- **포맷된 요약 내용** (불릿 포인트, 번호 목록)
- **YouTube 링크** (외부 앱으로 열기)
- **공유 기능** (시스템 공유 시트)
- **뒤로 가기** 네비게이션

## 🎨 UI/UX 디자인

### 디자인 시스템
- **컬러 팔레트** - Google Material Design 기반
- **타이포그래피** - 한국어 최적화 폰트
- **아이콘** - Expo Symbols (SF Symbols 호환)
- **레이아웃** - SafeArea 적용, iOS/Android 네이티브 룩앤필

### 다크/라이트 테마
```typescript
// 시스템 테마 자동 감지
const colorScheme = useColorScheme();
<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
```

### 접근성
- **한국어 UI** 완전 현지화
- **에러 메시지** 한국어 번역
- **날짜 형식** 한국 표준 (ko-KR)

## 📈 성능 최적화

### 캐싱 전략
- **로컬 우선** (Local-first) 데이터 로딩
- **증분 동기화** 로 네트워크 사용량 최소화
- **이미지 캐싱** (YouTube 썸네일 자동 캐시)
- **컴포넌트 메모이제이션** (React.memo, useMemo)

### 번들 최적화
- **Code Splitting** - Expo Router 기반 화면별 분할
- **Tree Shaking** - 사용하지 않는 코드 제거
- **이미지 최적화** - WebP 형식 지원

### 메모리 관리
```typescript
// 캐시 크기 제한
private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7일
private readonly MAX_ENTRIES = 500; // 최대 500개 비디오
```

## 🔧 개발 도구

### 디버깅
```bash
# Metro 번들러 로그
npx expo start --clear

# React Native 디버거
npx expo start --dev-client

# Flipper 연동 (네트워크, 스토리지 디버깅)
```

### 타입 체크
```typescript
// tsconfig.json - 엄격한 TypeScript 설정
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  }
}
```

### 린팅
```json
// ESLint 설정 (expo 권장)
{
  "extends": ["expo"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## 📦 빌드 & 배포

### EAS Build 설정

**development 빌드:**
```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```

**production 빌드:**
```bash
eas build --platform all --profile production
```

### EAS Submit
```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

### OTA 업데이트 (Over-The-Air)
```bash
# 코드 변경사항 즉시 배포
eas update --branch production --message "버그 수정 및 성능 개선"
```

## 🔒 보안

### 데이터 보호
- **Expo SecureStore** - 토큰, 민감한 정보 암호화 저장
- **HTTPS 강제** - 모든 API 통신 암호화
- **토큰 만료** 자동 처리

### 환경 변수 보안
```typescript
// .env 파일은 git에 포함하지 않음
# .gitignore
.env
.env.local
.env.production
```

### 권한 관리
```json
// Android 권한 (app.json)
"permissions": [
  "android.permission.INTERNET",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE"
]
```

## 🐛 에러 처리

### 네트워크 에러
```typescript
// 캐시 폴백 전략
catch (error) {
  console.error('API 요청 실패:', error);
  
  // 캐시된 데이터로 폴백
  const fallbackData = await videoCacheService.getCachedVideos();
  return fallbackData;
}
```

### 사용자 친화적 에러 메시지
```typescript
// 한국어 에러 메시지
const ERROR_MESSAGES = {
  NETWORK_ERROR: '인터넷 연결을 확인해주세요',
  AUTH_FAILED: '로그인에 실패했습니다',
  CACHE_ERROR: '데이터를 불러올 수 없습니다'
};
```

## 🧪 테스트

### 단위 테스트
```bash
# Jest 기반 테스트 (추후 추가 예정)
npm run test
```

### E2E 테스트
```bash
# Detox 기반 E2E 테스트 (추후 추가 예정)
npm run e2e:ios
npm run e2e:android
```

### 디바이스 테스트
- **iOS 시뮬레이터** - iPhone 14 Pro, iPad
- **Android 에뮬레이터** - Pixel 6, Galaxy S22
- **실제 기기** - 푸시 알림 테스트용

## 📄 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 🤝 기여하기

현재 개인 프로젝트로 진행 중입니다.

---

**개발자**: saulpark  
**최종 업데이트**: 2024년 1월  
**Expo SDK 버전**: 53  
**React Native 버전**: 0.79.5