# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shook Mobile App** - Expo React Native application providing YouTube channel monitoring with AI-powered video summaries and push notifications. Mobile companion to the Shook web application.

**Tech Stack**: Expo SDK 53 + React Native 0.79.5 + TypeScript 5.8.3 + Zustand + TanStack Query + AsyncStorage

## Development Commands

```bash
# Development
npm start                   # Start Expo dev server on port 19003
npm run android            # Android (uses 10.0.2.2:3000 for emulator)
npm run ios                # iOS (uses 192.168.0.156:3000 for simulator)
npm run web                # Web (uses localhost:3000)

# Code Quality
npm run lint               # ESLint with Expo config
npx tsc --noEmit          # TypeScript strict mode checking

# Cache Management
npx expo start --clear     # Clear Metro bundler cache (fixes asset loading issues)

# Build & Deploy
eas build --platform android --profile development
eas build --platform ios --profile development  
eas update --branch production --message "Update message"  # OTA updates
```

## Architecture Overview

### File-based Routing (Expo Router)
- `app/(tabs)/` - Tab screens: summaries, channels, settings  
- `app/auth.tsx` - Authentication with Google OAuth
- `app/summary-detail.tsx` - Video summary details

### State Management
- **Zustand + Immer**: Global state with immutable updates  
- **TanStack Query**: Server state with intelligent caching
- **AsyncStorage**: Video cache, 500 max entries, 7-day retention
- **Expo SecureStore**: Authentication tokens

### Core Services

**Hybrid Caching Strategy** (`src/hooks/useVideoSummariesCached.ts`):
- Load cached data first for instant UI
- 24-hour threshold: full sync vs incremental sync  
- Delta sync using `?since=timestamp` API parameter
- Auto-invalidation on user change

**Platform-specific API URLs** (`src/services/api.ts` + `app.config.js`):
- Android emulator: `10.0.2.2:3000`
- iOS simulator: `192.168.0.156:3000` (host machine IP)
- Web: `localhost:3000`
- Production: AWS EC2 instance

**Push Notifications** (`src/services/notification.ts`):
- Auto-register on login, unregister on logout
- Trigger delta sync when notification received  
- Deep link to specific video summaries

### Key Backend Integration

**API Endpoints**:
- Authentication: `/api/auth/google/mobile/verify` (bypasses OAuth policy restrictions)  
- Video Summaries: `/api/videos?since={timestamp}` (delta sync support)
- Channels: `/api/channels/user`, `/api/channels/search`
- Push: `/api/push/register`, `/api/push/unregister`

**Session Management**: Cookie-based (`credentials: 'include'`) shared with web app

### Environment Configuration

**Required Environment Variables** (`.env`):
```env
# Google OAuth (platform-specific client IDs)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com

# API URLs
EXPO_PUBLIC_API_URL=http://192.168.0.156:3000
EXPO_PUBLIC_API_URL_PRODUCTION=your-production-url

# App Configuration  
EXPO_PUBLIC_APP_SCHEME=com.shook.app
EXPO_LOCAL=true  # Enables platform-specific local URLs
```

### TypeScript Configuration

**Strict TypeScript** (`tsconfig.json`): `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`

**Path Aliases**: `@/components/*`, `@/services/*`, `@/stores/*`, `@/hooks/*`, etc.

### Key Integration Notes

**Mobile Auth Strategy**: Uses `/api/auth/google/mobile/verify` to bypass OAuth policy restrictions

**Cache Limits**: 500 videos max, 7-day retention, auto-invalidation on user change

**Real-time Updates**: Push notifications trigger `queryClient.refetchQueries()` for immediate sync

## Development Notes

### Platform Testing
- **Expo Go**: UI/UX testing  
- **Physical Devices**: Required for push notifications, Google OAuth
- **Emulators**: `npm run android` (auto-detects), `npm run ios` (macOS + Xcode)

### Cache Management
- Use `videoCacheService.clearCache()` - never clear AsyncStorage manually
- 24-hour threshold determines full vs incremental sync
- Cache auto-invalidates on user change

### Common Issues
- **Asset loading problems**: Run `npx expo start --clear` 
- **Type errors**: Run `npx tsc --noEmit` before commits
- **Platform URLs**: Android emulator needs `10.0.2.2:3000`, iOS simulator needs host IP

## Logging System

### Enhanced Logger (`src/utils/logger-enhanced.ts`)
- React Native-compatible structured logging
- AsyncStorage persistence, automatic sensitive data masking
- Environment-based log levels (DEBUG in dev, WARN+ in production)

**Available Loggers**:
```typescript
import { 
  apiLogger, cacheLogger, notificationLogger, 
  authLogger, serviceLogger 
} from '@/utils/logger-enhanced';
```

**HTTP Client** (`src/utils/http-client.ts`): Automatic request/response logging
```typescript
import { httpClient } from '@/utils/http-client';
const response = await httpClient.fetch('/api/endpoint');
```

### Usage Patterns
```typescript
// Use structured metadata for errors
serviceLogger.error('Operation failed', {
  operation: 'functionName',
  error: error.message,
  userId: user?.id
});

// Performance timing
const result = await serviceLogger.timeAsync('operation', asyncFunction);

// Use httpClient instead of fetch for auto-logging
const data = await httpClient.fetch('/api/endpoint');
```