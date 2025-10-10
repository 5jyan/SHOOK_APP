# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shook Mobile App** - Expo React Native application for YouTube channel monitoring with Kakao authentication, AI-powered video summaries, and push notifications. This is a mobile-first application with Korean UI/UX, sharing backend infrastructure with the Shook web application.

**Current Working Directory**: `C:\Users\saulpark\Documents\workspace\shook_app\` (Windows environment)

**Tech Stack**: Expo SDK 54 + React Native 0.81.4 + TypeScript 5.8.3 (strict mode) + Zustand + TanStack Query + AsyncStorage

## Development Commands

```bash
# Development
npm start                      # Start Expo dev server on port 19003
npm run start:tunnel           # Start with tunnel mode (no WiFi needed)
npm run android               # Launch Android emulator/device
npm run ios                   # Launch iOS simulator/device (macOS only)
npm run web                   # Launch web version

# Code Quality
npm run lint                  # ESLint with Expo config
npx tsc --noEmit             # TypeScript strict type checking

# Troubleshooting
npx expo start --clear        # Clear Metro bundler cache (fixes asset/module issues)

# Build & Deploy (EAS)
eas build --platform android --profile development    # Dev build with APK
eas build --platform ios --profile development        # Dev build with IPA
eas build --platform all --profile production         # Production AAB + IPA
eas update --branch production --message "message"   # OTA update (JS/assets only)
eas submit --platform android                         # Submit to Google Play
eas submit --platform ios                             # Submit to App Store
```

## Critical Architectural Patterns

### 1. Hybrid Caching Strategy (Most Important)

**Location**: `src/hooks/useVideoSummariesCached.ts` + `src/services/video-cache-enhanced.ts`

The app uses a sophisticated hybrid caching system that determines whether to perform full or incremental sync based on user behavior and channel changes:

**Decision Tree**:
1. **User changed** → Clear entire cache, set new userId, perform full sync
2. **Channel list changed** (`channel_list_changed` flag in AsyncStorage) → Full sync
3. **First sync** (lastSyncTimestamp === 0) → Full sync
4. **Otherwise** → Incremental sync using `?since={lastSyncTimestamp}`

**Full Sync** (replaces entire cache):
```typescript
await apiService.getVideoSummaries()  // No 'since' param
await videoCacheService.saveVideosToCache(serverVideos)  // Replace all
await videoCacheService.clearChannelChangeSignal()  // Clear flag after success
```

**Incremental Sync** (merges new videos):
```typescript
await apiService.getVideoSummaries(lastSyncTimestamp)  // ?since={timestamp}
await videoCacheService.mergeVideos(newVideos)  // Merge with existing cache
```

**Channel Change Detection**:
- When user subscribes/unsubscribes: `videoCacheService.signalChannelListChanged()` sets timestamp flag
- Next sync detects: `hasChannelListChanged()` compares flag timestamp with last video sync
- After full sync completes: `clearChannelChangeSignal()` removes flag
- **Critical**: Without this, unsubscribed channel's videos would remain in cache indefinitely

**30-Day Automatic Filtering**:
- API enforces: `?since=` parameter is automatically clamped to max 30 days ago in `api.ts`
- Cache enforces: `filterRecentVideos()` removes videos older than 30 days before saving
- Periodic cleanup: `cleanOldVideos()` removes expired entries during reads
- **Reason**: Focus on recent content, limit mobile storage usage, match user behavior patterns

**Cache Limits**:
- Max age: 30 days (auto-cleaned during reads)
- Max entries: 1000 videos (enforced during save)
- Validation interval: 24 hours (background health checks)

**Enhanced Cache Service Features**:
- **Atomic Transactions**: `CacheTransaction` class provides ACID properties with rollback support
- **Corruption Detection**: `CacheValidator` automatically detects integrity issues with checksums
- **Auto Recovery**: `CacheRecovery` restores from backups or repairs corrupted data
- **Clock Skew Handling**: Uses server-side video timestamps instead of client time to avoid sync issues

### 2. Backend API Integration

**Base URL Configuration** (`app.config.js` + `src/services/api.ts`):
```javascript
// Platform-specific URLs for deployment:
android: 'https://shook.work'    // AWS EC2 production
ios: 'https://shook.work'        // AWS EC2 production
web: 'https://shook.work'        // AWS EC2 production
```

**Session Management**:
- Cookie-based sessions (shared with web app backend)
- All requests must include: `credentials: 'include'`
- Session survives app restarts (persistent cookies in native WebView)

**Response Structure Transformation**:
Backend returns flat channel data that must be transformed to nested structure:
```typescript
// Backend response: { subscriptionId, channelId, title, thumbnail, ... }
// App expects: { id, userId, channelId, youtubeChannel: { channelId, title, ... } }
// Transformation happens in apiService.getUserChannels() - see api.ts:243-274
```

**Critical API Endpoints**:
- `POST /api/auth/kakao/verify` - Verify Kakao access token, create session
- `POST /api/logout` - Destroy session (returns plain text "OK", special handling in api.ts:134)
- `GET /api/videos?since={timestamp}` - Delta sync with automatic 30-day filter (api.ts:290-324)
- `GET /api/channels/{userId}` - Get user's subscribed channels with transformation
- `POST /api/channels` - Subscribe to channel (triggers channel change flag)
- `DELETE /api/channels/{channelId}` - Unsubscribe (triggers channel change flag)
- `POST /api/push-tokens` - Register push notification token (upsert logic on backend)
- `DELETE /api/push-tokens/{deviceId}` - Unregister push token
- `GET /api/push-tokens` - Get user's registered tokens (for state sync)

### 3. Push Notifications Architecture

**Location**: `src/services/notification.ts` + `app/_layout.tsx`

**Registration Flow**:
1. User logs in → `authStore.login()` calls `notificationService.initialize()`
2. Check device permissions → Request if needed
3. Generate Expo Push Token (requires EAS projectId: `a8839540-39ec-431e-a346-bdfdff731ecd`)
4. Register token with backend via `POST /api/push-tokens`
5. Backend handles duplicates with upsert logic (safe to re-register)

**Notification Handling**:
- **Received while app running**: Triggers incremental sync via `queryClient.refetchQueries(['videoSummariesCached'])`
- **Tap to open**: Deep links to `/summary-detail?summaryId={videoId}` or fallback to `/summaries` tab
- **Background state sync**: `syncWithBackendState()` queries DB to verify registration status

**Store Integration** (`src/stores/notification-store.ts`):
- `isRegistered` - Backend registration status (synced from DB via `/api/push-tokens`)
- `isUIEnabled` - User's UI toggle state (independent of backend, can differ during sync)
- `permissionStatus` - System permission state ('granted', 'denied', 'undetermined')
- `lastSyncTime` - Last backend sync timestamp (prevents excessive API calls)

**Critical Notification Listener** (in `app/_layout.tsx`):
```typescript
// When notification received while app running:
Notifications.addNotificationReceivedListener(notification => {
  if (notification.request.content.data?.type === 'new_video_summary') {
    queryClient.refetchQueries({ queryKey: ['videoSummariesCached'] });
    // This triggers incremental sync, merges new video into cache
  }
});

// When user taps notification:
Notifications.addNotificationResponseReceivedListener(response => {
  const videoId = response.notification.request.content.data?.videoId;
  router.push({ pathname: '/summary-detail', params: { summaryId: videoId } });
  // Navigate first for instant feedback, then trigger background sync
});
```

### 4. Authentication System

**Kakao OAuth 2.0 Flow** (`src/services/kakao-auth.ts` + `src/stores/auth-store.ts`):

1. **User taps "카카오 로그인" button** → `kakaoAuthService.login()`
2. **Kakao SDK authentication** → Receive access token
3. **Backend verification** → `POST /api/auth/kakao/verify` with `{ accessToken }`
4. **Session creation** → Backend creates cookie-based session, returns user data
5. **Store user info** → `authStore.login(user)` saves to secure storage
6. **Initialize notifications** → Auto-registers push token if permissions granted
7. **Clear channel change flag** → Reset for fresh start with new user

**Zustand + Immer Store** (`src/stores/auth-store.ts`):
```typescript
interface User {
  id: string;          // Required for cache segregation
  username: string;    // Display name
  email?: string;      // Optional email
  role?: 'user' | 'tester' | 'manager';  // Backend role system
}

// Persisted to SecureStore (encrypted on device)
authStore.login(user)   // Sets user, isAuthenticated, initializes notifications
authStore.logout()      // Clears user, clears notification tokens, preserves cache
```

**Session Persistence**:
- Backend session stored in PostgreSQL (connect-pg-simple)
- Client receives session cookie (HttpOnly, secure in production)
- App restarts preserve session (cookie survives until expiry or logout)

### 5. State Management Layers

**Global State (Zustand + Immer)**:
- `auth-store.ts` - User authentication state with SecureStore persistence
- `notification-store.ts` - Push notification registration state

**Server State (TanStack Query)**:
- `['videoSummariesCached', userId]` - Main video feed with hybrid caching
- `['userChannels', userId]` - Subscribed channels list
- `['channelSearch', query]` - YouTube channel search results with debouncing
- All queries have `enabled: !!user` to prevent unauthorized requests

**Local Persistent State (AsyncStorage)**:
- `video_summaries_cache` - CacheEntry[] with videoId, data, cachedAt, channelId
- `video_cache_metadata` - Sync timestamps, userId, integrity checksums
- `channel_list_changed` - Timestamp flag for detecting channel subscription changes
- `auth-storage` - Encrypted user info (via SecureStore adapter)
- `expo_push_token` - Cached Expo push token to avoid regeneration

**Query Invalidation Strategy**:
```typescript
// After channel subscription changes:
await videoCacheService.signalChannelListChanged();
queryClient.invalidateQueries(['userChannels']);
// Next video sync will detect flag and do full sync

// After receiving push notification:
queryClient.refetchQueries(['videoSummariesCached']);
// Triggers incremental sync to fetch new video

// After manual pull-to-refresh:
queryClient.refetchQueries(['videoSummariesCached']);
// Honors incremental sync unless channel change flag is set
```

## Environment Configuration

**Required Variables** (`.env`):
```env
# Kakao OAuth (from Kakao Developers console)
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=your_kakao_native_app_key

# API URLs
EXPO_PUBLIC_API_URL=http://192.168.0.156:3000           # Local dev
EXPO_PUBLIC_API_URL_PRODUCTION=https://shook.work       # Production

# App Configuration
EXPO_PUBLIC_APP_SCHEME=com.shook.app
EXPO_LOCAL=true  # Enables platform-specific local URLs
```

**Dynamic Configuration** (`app.config.js`):
- Platform-specific API URLs via `getApiUrl()` helper function
- EAS project ID for push notifications: `a8839540-39ec-431e-a346-bdfdff731ecd`
- Kakao URL scheme: `kakao{NATIVE_APP_KEY}` for deep linking
- Runtime version: `policy: "appVersion"` for OTA update compatibility

## TypeScript Configuration

**Strict Mode Enabled** (`tsconfig.json`):
```json
{
  "strict": true,                        // All strict checks
  "exactOptionalPropertyTypes": true,    // Exact optional types
  "noUncheckedIndexedAccess": true,      // Array access safety
  "noImplicitOverride": true             // Explicit overrides
}
```

**Path Aliases**:
- `@/*` - Root src directory and project root
- `@/components/*` - React components
- `@/services/*` - API and external services
- `@/hooks/*` - Custom React hooks
- `@/stores/*` - Zustand state stores
- `@/lib/*` - Utilities and configurations
- `@/utils/*` - Helper functions
- `@/types/*` - TypeScript type definitions

## File-based Routing (Expo Router)

**Route Structure**:
- `app/_layout.tsx` - Root layout with auth check, font loading, notification setup
- `app/(tabs)/_layout.tsx` - Tab navigation with 4 tabs
- `app/(tabs)/index.tsx` - Home/landing screen
- `app/(tabs)/channels.tsx` - Channel management (search, subscribe, list)
- `app/(tabs)/summaries.tsx` - Video summaries feed with pull-to-refresh
- `app/(tabs)/settings.tsx` - User settings, notifications, cache stats
- `app/auth.tsx` - Kakao authentication screen
- `app/summary-detail.tsx` - Video summary detail with YouTube link
- `app/notification-settings.tsx` - Push notification preferences
- `app/developer-tools.tsx` - Debug tools for testing sync and push

**Deep Linking**:
- Push notifications link to: `/summary-detail?summaryId={videoId}`
- Scheme: `com.shook.app://` (configured in app.config.js)

## Enhanced Logging System

**Location**: `src/utils/logger-enhanced.ts` + `src/utils/http-client.ts`

**Category-specific Loggers**:
- `apiLogger` - API requests, responses, errors
- `cacheLogger` - Cache operations, validation, recovery
- `notificationLogger` - Push notification lifecycle
- `authLogger` - Authentication flow, session management
- `serviceLogger` - General service operations
- `configLogger` - App configuration and initialization

**HTTP Client with Auto-logging** (`src/utils/http-client.ts`):
```typescript
// Wrapper around fetch with automatic request/response logging
await httpClient.fetch(url, {
  method: 'POST',
  body: JSON.stringify(data),
  logResponseBody: false,  // Set true for detailed response logging
});
// Automatically logs: request method/URL/headers, response status/time, errors
```

**AsyncStorage Persistence**:
- Logs saved to AsyncStorage with keys: `@logger:{category}:{timestamp}`
- Automatic rotation: keeps last 100 entries per category
- Sensitive data masking: auto-redacts tokens, passwords in log output

**Performance Timing**:
```typescript
const timerId = logger.startTimer('operation-name');
// ... perform operation
logger.endTimer(timerId, 'Operation completed');
// Logs execution time in milliseconds
```

## Common Development Workflows

### Adding a New Channel (triggers full sync)

1. User searches for channel in "채널" tab → `apiService.searchChannels(query)`
2. User taps "구독" button → `apiService.addChannel(channelId)`
3. Backend adds to `user_channels` table
4. App calls `videoCacheService.signalChannelListChanged()` → Sets timestamp flag
5. Next video sync detects flag via `hasChannelListChanged()` → Returns true
6. Performs full sync: `getVideoSummaries()` without `since` param
7. Replaces entire cache: `saveVideosToCache(allVideos)`
8. Clears flag: `clearChannelChangeSignal()`
9. User sees videos from new channel in "요약" tab

### Handling Push Notification (triggers incremental sync)

1. Backend detects new video → Sends push via Expo Push Service
2. Device receives notification → OS displays alert
3. If app running: `notificationListener` fires → Calls `queryClient.refetchQueries(['videoSummariesCached'])`
4. Hook detects no channel changes → Performs incremental sync: `getVideoSummaries(lastSyncTimestamp)`
5. Backend returns only new videos since timestamp
6. App merges: `videoCacheService.mergeVideos(newVideos)` → Deduplicates, sorts, saves
7. TanStack Query updates → UI auto-refreshes with new video card
8. If user taps notification: Navigates to `/summary-detail` → Triggers same sync in background

### User Logout Flow

1. User taps "로그아웃" in settings
2. App calls `apiService.logout()` → Backend destroys session
3. App calls `authStore.logout()` → Triggers notification cleanup
4. Notification service clears local token (not backend registration)
5. Auth state clears user info from SecureStore
6. Router redirects to `/auth` screen
7. **Important**: Cache is preserved for faster re-login

### Testing Incremental vs Full Sync

Use the Developer Tools screen (`app/developer-tools.tsx`):
- "Clear Cache" → Forces next sync to be full (lastSyncTimestamp = 0)
- "Signal Channel Change" → Sets flag, forces full sync even with valid timestamp
- "Clear Channel Signal" → Removes flag, next sync will be incremental
- "Sync Now" → Manual trigger to test current sync behavior
- "Send Test Push" → Backend sends test notification to verify flow

## Platform-Specific Considerations

### Android
- API URL: Use AWS EC2 production URL `https://shook.work`
- Local testing: Emulator can access host machine via `10.0.2.2`, but use production for consistency
- Push notifications: Require dev build (Expo Go has limitations)
- Kakao SDK: Requires signature hash in Kakao Developers console

### iOS
- API URL: Use AWS EC2 production URL `https://shook.work`
- Local testing: Simulator uses host IP `192.168.0.156`, but use production for consistency
- Push notifications: Require dev build + macOS + Xcode
- Kakao SDK: Requires bundle identifier registered in Kakao Developers console
- URL scheme: `kakao{NATIVE_APP_KEY}` must be in Info.plist (handled by app.config.js)

### Web
- Limited functionality (primary target is native mobile)
- API URL: Production backend
- Push notifications: Not supported in web version
- Kakao auth: May have CORS issues, prefer native app for testing

## Error Handling Patterns

### Network Errors (fallback to cache)
```typescript
try {
  const serverData = await apiService.getVideoSummaries();
  return serverData;
} catch (error) {
  const cachedData = await videoCacheService.getCachedVideos();
  return cachedData; // User sees stale data instead of error screen
}
```

### Cache Corruption (auto-recovery)
```typescript
const isHealthy = await cacheValidator.quickHealthCheck();
if (!isHealthy) {
  const recovered = await cacheRecovery.autoRecover();
  if (recovered) {
    return await this.getCachedVideos(); // Retry after recovery
  }
}
```

### Push Notification Registration Errors
```typescript
// If registration fails, app continues without notifications
// User can retry via Settings → 알림 설정 → Toggle switch
// Backend state sync ensures consistency between app and server
```

## Important Development Notes

### Channel Change Detection is Critical
- **Must call** `videoCacheService.signalChannelListChanged()` after any subscribe/unsubscribe operation
- Without this, cache will have videos from old channels or miss videos from new channels
- Backend doesn't track user's channel list changes, so app must manage sync logic

### 30-Day Filter is Enforced at Multiple Layers
- **API layer**: `getVideoSummaries()` clamps `since` param to 30 days max (api.ts:292)
- **Cache layer**: `filterRecentVideos()` removes old videos before saving (video-cache-enhanced.ts:965)
- **Read layer**: `getCachedVideos()` filters out expired entries (video-cache-enhanced.ts:240)
- **Reason**: Mobile storage constraints, API quota limits, user behavior patterns

### Session Cookies Require Special Handling
- All API requests **must** include: `credentials: 'include'`
- Session survives app restarts but not logout
- Backend session timeout is managed server-side (typically 30 days)
- Use `/api/user` endpoint to verify session validity

### Expo Go vs Development Build
- **Expo Go**: Quick testing, but push notifications won't work properly
- **Dev Build**: Full native capabilities, required for final testing
- **Production Build**: Optimized bundle, submitted to app stores

### EAS Update (OTA) Limitations
- Can update: JavaScript code, React components, assets (images, fonts)
- **Cannot update**: Native code, app.config.js native settings, package.json native dependencies
- Requires full rebuild: SDK version upgrades, new native modules, permission changes

## Testing Checklist

### Before Production Deployment
1. **Authentication**: Test Kakao login/logout, session persistence across restarts
2. **Channel Management**: Subscribe/unsubscribe multiple channels, verify full sync triggers
3. **Video Sync**: Test incremental sync (normal), full sync (channel change), 30-day filtering
4. **Push Notifications**: Test on physical device, verify registration, tap to open, background sync
5. **Offline Mode**: Disable network, verify cached data loads, re-enable and verify sync
6. **Cache Recovery**: Corrupt cache (manual), verify auto-recovery restores data
7. **Cross-platform**: Test on Android and iOS with same backend
8. **Role System**: Test with 'user', 'tester', 'manager' roles (backend enforcement)

### Device Testing Requirements
- **iOS**: Physical device or simulator (push requires physical device)
- **Android**: Emulator or physical device (push requires physical device for reliable testing)
- **Minimum**: Test on one Android device and one iOS device before release
