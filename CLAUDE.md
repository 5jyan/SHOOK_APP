# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shook Mobile App** - Expo React Native application for YouTube channel monitoring with AI-powered video summaries and push notifications. This is the mobile companion to the Shook web application, sharing the same backend API.

**Tech Stack**: Expo SDK 53 + React Native 0.79.5 + TypeScript 5.8.3 (strict mode) + Zustand + TanStack Query + AsyncStorage

## Development Commands

```bash
# Development
npm start                   # Start Expo dev server on port 19003
npm run start:tunnel        # Start with tunnel mode (no WiFi needed)
npm run android            # Start on Android emulator/device
npm run ios                # Start on iOS simulator/device (macOS only)
npm run web                # Start web version

# Code Quality
npm run lint               # ESLint with Expo config
npx tsc --noEmit          # TypeScript type checking (strict mode)

# Cache Management
npx expo start --clear     # Clear Metro bundler cache (fixes asset loading)

# Build & Deploy
eas build --platform android --profile development
eas build --platform ios --profile development
eas build --platform all --profile production
eas update --branch production --message "Update message"  # OTA updates
eas submit --platform android  # Google Play Store
eas submit --platform ios      # Apple App Store
```

## Architecture Overview

### File-based Routing (Expo Router)
- `app/_layout.tsx` - Root layout with auth check, font loading, notification listeners
- `app/(tabs)/_layout.tsx` - Tab navigation layout
- `app/(tabs)/` - Tab screens: index (home), summaries, channels, settings
- `app/auth.tsx` - Google OAuth authentication screen
- `app/summary-detail.tsx` - Video summary detail with deep linking support

### State Management Architecture
- **Zustand + Immer**: Global state (auth, notifications) - `src/stores/`
- **TanStack Query**: Server state caching with intelligent invalidation - `src/hooks/`
- **AsyncStorage**: Persistent video cache (30 days, 1000 entries max) - `src/services/video-cache*.ts`
- **Expo SecureStore**: Encrypted token storage

### Hybrid Caching Strategy (Critical Pattern)

**Location**: `src/hooks/useVideoSummariesCached.ts` + `src/services/video-cache-enhanced.ts`

The app uses a sophisticated hybrid caching strategy that determines whether to do full or incremental sync:

```typescript
// Decision tree:
// 1. Check if user changed → clear cache if yes
// 2. Check if channel list changed → full sync if yes
// 3. Otherwise → incremental sync using ?since={lastSyncTimestamp}

// Full Sync (replaces entire cache):
await apiService.getVideoSummaries()  // No 'since' param

// Incremental Sync (merges new videos):
await apiService.getVideoSummaries(lastSyncTimestamp)  // ?since={timestamp}
```

**Channel Change Detection**: When user subscribes/unsubscribes channels, a flag is set (`channel_list_changed` key in AsyncStorage). Next sync detects this and performs full sync to refresh all videos, then clears the flag.

**Cache Limits**:
- 30-day retention (older videos auto-cleaned)
- 1000 video maximum (enforced during save)
- API enforces 30-day filter: `?since=` is clamped to max 30 days ago

**Validation & Recovery**: Enhanced cache service (`video-cache-enhanced.ts`) provides:
- Atomic transactions with rollback (CacheTransaction)
- Corruption detection and auto-recovery (CacheValidator, CacheRecovery)
- Integrity checksums with expo-crypto

### Backend API Integration

**Base URL Configuration** (`src/services/api.ts` + `app.config.js`):
```javascript
// Platform-specific URLs for local development:
android: 'https://shook.work'        // AWS EC2 production
ios: 'https://shook.work'            // AWS EC2 production
web: 'https://shook.work'            // AWS EC2 production
```

**Critical API Endpoints**:
- `POST /api/auth/google/verify` - Verify Google ID token, create session
- `POST /api/auth/google/mobile/login` - Temporary mobile login (bypasses OAuth policy)
- `GET /api/videos?since={timestamp}` - Delta sync with 30-day filter
- `GET /api/channels/{userId}` - Get user's subscribed channels
- `POST /api/push-tokens` - Register push notification token
- `DELETE /api/push-tokens/{deviceId}` - Unregister push token

**Session Management**: Cookie-based sessions with `credentials: 'include'` on all requests

**Response Structure Transformation**: Backend returns flat channel data; API service transforms to nested structure:
```typescript
// Backend: { subscriptionId, channelId, title, thumbnail, ... }
// App expects: { id, userId, channelId, youtubeChannel: { channelId, title, ... } }
// See getUserChannels() in api.ts for transformation logic
```

### Push Notifications Architecture

**Location**: `src/services/notification.ts` + `app/_layout.tsx`

**Registration Flow**:
1. Device permissions requested on first use
2. Expo Push Token generated (requires EAS projectId from app.config.js)
3. Token + deviceId registered with backend via `/api/push-tokens`
4. State synced with backend to prevent duplicate registrations

**Notification Handling**:
- **Received while app running**: Triggers incremental sync via `queryClient.refetchQueries(['videoSummariesCached'])`
- **Tap to open**: Deep links to `/summary-detail` with videoId, or falls back to `/summaries` tab
- **Background state sync**: `syncWithBackendState()` checks DB for current registration status

**Store Integration**: `src/stores/notification-store.ts` tracks:
- `isRegistered` - Backend registration status (synced from DB)
- `isUIEnabled` - User's UI toggle state (independent of backend)
- `permissionStatus` - System permission state
- `lastSyncTime` - Last backend sync timestamp

### Environment Configuration

**Required Variables** (`.env`):
```env
# Google OAuth (platform-specific)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=xxx.apps.googleusercontent.com

# API URLs
EXPO_PUBLIC_API_URL=http://192.168.0.156:3000  # Local development
EXPO_PUBLIC_API_URL_PRODUCTION=https://shook.work  # Production

# App Configuration
EXPO_PUBLIC_APP_SCHEME=com.shook.app
EXPO_LOCAL=true  # Enables platform-specific local URLs
```

**Dynamic Configuration** (`app.config.js`):
- Platform-specific API URLs via `getApiUrl()` helper
- EAS project ID: `a8839540-39ec-431e-a346-bdfdff731ecd`
- Google Sign-In iOS URL scheme: `com.googleusercontent.apps.441727275663-eqkgdijbp2mfbnk8jfrqja6uo9ul0ecd`

### TypeScript Configuration

**Strict Mode Enabled** (`tsconfig.json`):
```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

**Path Aliases**: `@/components/*`, `@/services/*`, `@/stores/*`, `@/hooks/*`, `@/lib/*`, `@/types/*`, `@/contexts/*`, `@/assets/*`

### Key Integration Patterns

**Google OAuth Flow**:
1. Expo AuthSession requests Google authorization
2. Receive Google ID token
3. Send to `/api/auth/google/verify` to create session
4. Store user info in Zustand auth store
5. Initialize push notifications
6. Clear channel change flag to prepare for first sync

**Channel Subscribe/Unsubscribe**:
1. Call `apiService.addChannel(channelId)` or `deleteChannel(channelId)`
2. Set `channel_list_changed` flag in AsyncStorage
3. Next video sync will detect flag and do full sync
4. Cache is refreshed with videos from new channel list
5. Flag is cleared after successful full sync

**Video Cache Invalidation**:
- User change → Clear entire cache, set new userId in metadata
- Channel list change → Set flag, next sync does full refresh
- 30+ day old videos → Auto-cleaned during any cache read operation
- Manual refresh → `queryClient.refetchQueries()` triggers incremental sync

## Advanced Features

### Logging System

**Enhanced Loggers** (`src/utils/logger-enhanced.ts`):
- Category-specific loggers: `apiLogger`, `cacheLogger`, `notificationLogger`, `authLogger`, `serviceLogger`
- AsyncStorage persistence with auto-rotation
- Automatic sensitive data masking (tokens, passwords)
- Structured metadata with type safety
- Performance timing: `startTimer()`, `endTimer()`, `timeAsync()`

**HTTP Client** (`src/utils/http-client.ts`):
- Wrapper around fetch with automatic request/response logging
- Response body logging configurable per-request
- Use `httpClient.fetch()` instead of raw `fetch()` for auto-logging

### Error Handling Patterns

**Fallback Strategy**:
```typescript
// Always provide cached data as fallback
try {
  const serverData = await apiService.getVideoSummaries();
  return serverData;
} catch (error) {
  const cachedData = await videoCacheService.getCachedVideos();
  return cachedData; // User sees stale data instead of error
}
```

**Graceful Degradation**:
- Network errors → Show cached data with "Last synced" timestamp
- Auth errors → Redirect to login, preserve cache for return
- Push notification failures → Continue without notifications, don't block app

## Common Issues & Solutions

### Cache Issues
- **Stale data**: Use `npx expo start --clear` to reset Metro bundler
- **Corrupted cache**: Enhanced service auto-detects and recovers via `CacheRecovery`
- **Large cache size**: Auto-limited to 1000 entries, 30 days max age

### Platform-Specific Issues
- **Android emulator API**: Use `10.0.2.2:3000` for localhost, or AWS EC2 for real testing
- **iOS simulator API**: Use host machine IP `192.168.0.156:3000` or AWS EC2
- **Expo Go compatibility**: AsyncStorage works, but push notifications require dev build

### Push Notification Issues
- **"No project ID" error**: Check `app.config.js` extra.eas.projectId is set
- **Duplicate registrations**: Backend handles via upsert, safe to re-register
- **Unregister failing**: Service tries multiple endpoints (`/push-tokens/{id}` and `/push/unregister`)

### Google OAuth Issues
- **"Sign-in failed"**: Check platform-specific client IDs in `.env`
- **OAuth policy restrictions**: Use `/api/auth/google/mobile/login` temporary endpoint as fallback
- **Session not persisted**: Ensure `credentials: 'include'` on all API calls

## Testing Strategy

### Manual Testing Workflow
1. **Authentication**: Test Google OAuth flow, session persistence across app restarts
2. **Channel Management**: Subscribe/unsubscribe, verify full sync triggers
3. **Video Sync**: Test incremental sync (normal), full sync (channel change), 30-day limit
4. **Push Notifications**: Test on physical device, verify deep linking to summary detail
5. **Offline Mode**: Disable network, verify cached data loads, re-enable to sync

### Device Testing
- **Expo Go**: Quick UI/UX iteration (limited push notifications)
- **Android Emulator**: Full testing including push (requires dev build)
- **iOS Simulator**: Full testing including push (requires dev build + macOS + Xcode)
- **Physical Devices**: Required for final Google OAuth and push notification testing

## Important Architectural Decisions

### Why Hybrid Caching?
- **Bandwidth efficiency**: Incremental sync reduces mobile data usage
- **Instant UI**: Load cached data first, sync in background
- **Offline support**: App fully functional without network
- **30-day focus**: Aligns with user behavior (recent content matters most)

### Why Channel Change Detection?
- **Consistency**: Ensures cache matches subscribed channels exactly
- **Performance**: Avoids unnecessary full syncs when possible
- **User experience**: Fresh content immediately after channel changes

### Why Cookie Sessions (not JWT)?
- **Backend compatibility**: Shares session store with web app
- **Security**: HttpOnly cookies prevent XSS token theft
- **Simplicity**: No token refresh logic needed on mobile

### Why Enhanced Cache Service?
- **Reliability**: Atomic transactions prevent partial writes
- **Recovery**: Auto-detects and fixes corrupted cache without user intervention
- **Validation**: Checksums ensure data integrity across app sessions

## File Organization Patterns

### Services Layer (`src/services/`)
- **api.ts**: Backend HTTP client with response transformation
- **video-cache.ts**: Legacy cache (DEPRECATED, use enhanced version)
- **video-cache-enhanced.ts**: Production cache with ACID properties
- **notification.ts**: Push notification registration and handling
- **google-auth*.ts**: Google OAuth service variations

### Hooks Layer (`src/hooks/`)
- **useVideoSummariesCached.ts**: Main video sync hook with hybrid strategy
- **useUserChannels.ts**: Channel subscription management
- **useChannelSearch.ts**: YouTube channel search with debouncing
- **useGoogleAuth*.ts**: Google OAuth flow hooks (multiple implementations)

### Stores Layer (`src/stores/`)
- **auth-store.ts**: User authentication state (Zustand + Immer)
- **notification-store.ts**: Push notification registration state

### Components Layer (`src/components/`)
- **ui/**: Shadcn-style base components (Button, Input, Card, etc.)
- **SummaryCard.tsx**: Video summary card with thumbnail and metadata
- **ChannelList.tsx**: User's subscribed channels with unsubscribe action
- **GoogleSignInButton.tsx**: Google OAuth button with loading state
- **EmptyState.tsx**: Friendly empty state for no data scenarios

## Production Deployment Notes

### EAS Build Profiles (eas.json)
- **development**: Development client, APK, internal distribution, development OTA channel
- **preview**: APK, internal distribution, preview OTA channel
- **production**: AAB (Google Play), production OTA channel

### Pre-deployment Checklist
1. Update version in `app.config.js`
2. Run `npx tsc --noEmit` - verify no type errors
3. Run `npm run lint` - verify no lint errors
4. Test on physical devices (iOS + Android)
5. Verify push notifications work with production backend
6. Test full sync, incremental sync, channel changes
7. Check cache recovery on corrupted data scenarios

### OTA Update Strategy
- **Minor fixes**: Use EAS Update for instant deployment
- **Native code changes**: Requires new build via `eas build`
- **Breaking changes**: Bump `runtimeVersion` in app.config.js

### Monitoring
- Use structured logging with context metadata
- Check AsyncStorage for persisted logs (`@logger:*` keys)
- Monitor push token registration success rate
- Track cache hit/miss ratios via logger output
