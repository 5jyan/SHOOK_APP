# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Shook Mobile App** - an Expo React Native application that serves as the mobile companion to the Shook web application. It provides YouTube channel monitoring and AI-powered video summaries with push notification support.

**Tech Stack**: Expo SDK 53 + React Native 0.79.5 + TypeScript 5.8.3 + Zustand + TanStack Query + AsyncStorage

## Development Commands

```bash
# Development (port 19003 specifically configured)
npm start                   # Start Expo dev server on port 19003
npm run start:tunnel        # Start with tunnel mode for network access
npx expo start             # Alternative start command
npm run android            # Start on Android (uses emulator URL 10.0.2.2:3000)
npm run ios                # Start on iOS (uses local IP 192.168.0.156:3000)
npm run web                # Start web version (uses localhost:3000)

# Code Quality & Type Checking
npm run lint               # Run Expo linting (ESLint with Expo config)
npx tsc --noEmit          # TypeScript type checking (strict mode enabled)

# Environment Management
npx expo start --clear     # Clear Metro bundler cache
npx expo start --dev-client # Start with development client

# Build & Distribution
eas build --platform android --profile development  # Development build for Android
eas build --platform ios --profile development     # Development build for iOS  
eas build --platform all --profile production     # Production builds
eas update --branch production --message "Update message"  # OTA updates

# Installation
npm install                # Install all dependencies
```

## Architecture Overview

### File-based Routing (Expo Router)
- `app/` directory contains all screens and layouts
- `app/(tabs)/` - Tab navigator with main screens (summaries, channels, settings)
- `app/auth.tsx` - Authentication screen
- `app/summary-detail.tsx` - Individual video summary details

### State Management Architecture
- **Zustand + Immer**: Global state with immutable updates
- **Secure Persistence**: Auth state persisted using Expo SecureStore
- **TanStack Query**: Server state management with intelligent caching
- **AsyncStorage**: Local caching for video summaries and metadata

### Key Services and Stores

**Authentication Flow** (`src/stores/auth-store.ts`):
- Persistent authentication state with SecureStore
- Google OAuth integration with automatic notification registration
- Session-based authentication with backend cookies

**Video Caching System** (`src/services/video-cache.ts`):
- Hybrid cache strategy: AsyncStorage + TanStack Query
- Delta synchronization using `lastSyncTimestamp` parameter
- Incremental vs full sync based on 24-hour threshold
- Automatic cache invalidation on user change

**Push Notifications** (`src/services/notification.ts`):
- Automatic backend sync when notifications received
- Deep linking to specific video summaries
- Push token registration/unregistration with backend
- Real-time UI updates via TanStack Query integration

**Backend Integration** (`src/services/api.ts`):
- Session cookie-based authentication (`credentials: 'include'`)
- Shared API endpoints with Shook web application
- Google OAuth token verification
- YouTube channel management and video summary fetching

### Critical Architectural Patterns

**Multi-Platform API URL Resolution** (`src/services/api.ts:6-35` + `app.config.js:7-21`):
```typescript
// Platform-specific API URLs determined at runtime
const getLocalApiUrl = (localUrls: any) => {
  // Android emulator: 10.0.2.2:3000
  // iOS simulator: 192.168.0.156:3000 (actual IP)  
  // Web: localhost:3000
  if (Platform.OS === 'android') return localUrls.android;
  if (Platform.OS === 'ios') return localUrls.ios;
  return localUrls.default;
};
```

**Hybrid Cache Strategy with Delta Sync** (`src/hooks/useVideoSummariesCached.ts:24-70`):
```typescript
// Step 1: Load cached data immediately for instant UI
const cachedVideos = await videoCacheService.getCachedVideos();

// Step 2: Determine sync strategy (24-hour threshold)
const cacheAge = Date.now() - lastSyncTimestamp;
const shouldFullSync = cacheAge > FULL_SYNC_THRESHOLD;

// Step 3: Incremental vs full sync
if (shouldFullSync) {
  const response = await apiService.getVideoSummaries(); // All videos
} else {
  const response = await apiService.getVideoSummaries(lastSyncTimestamp); // Delta only
}
```

**Zustand with Immer and Secure Persistence** (`src/stores/auth-store.ts:34-50`):
```typescript
export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set, get) => ({
      login: (user: User) => set((state) => {
        state.user = user;
        state.isAuthenticated = true;
        // Auto-initialize push notifications on login
        notificationService.initialize().catch(console.error);
      }),
    })),
    { storage: createJSONStorage(() => secureStorage) }
  )
);
```

**Tab Focus-Triggered Data Refresh** (`app/(tabs)/summaries.tsx:47-53`):
```typescript
const isFocused = useIsFocused();
React.useEffect(() => {
  if (isFocused) {
    console.log('Tab focused - checking for new data...');
    refetch(); // Triggers incremental sync via useVideoSummariesCached
  }
}, [isFocused, refetch]);
```

### Environment Configuration & Platform-Specific URLs

**Multi-Environment API Configuration** (`app.config.js:6-21`):
```javascript
// Environment-based API URL determination
const getApiUrl = () => {
  if (IS_LOCAL) {
    return {
      android: 'http://10.0.2.2:3000',        // Android emulator special IP
      ios: 'http://192.168.0.156:3000',       // iOS simulator uses host IP
      web: 'http://localhost:3000',           // Web development
      default: 'http://192.168.0.156:3000'    // Fallback
    };
  }
  if (IS_DEV) return process.env.EXPO_PUBLIC_API_URL;
  return process.env.EXPO_PUBLIC_API_URL_PRODUCTION; // AWS EC2 production
};
```

**Required Environment Variables** (`.env`):
```env
# Google OAuth (platform-specific client IDs required)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=441727275663-eqkgdijbp2mfbnk8jfrqja6uo9ul0ecd.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# API URLs (environment-specific)
EXPO_PUBLIC_API_URL=http://192.168.0.156:3000
EXPO_PUBLIC_API_URL_PRODUCTION=http://ec2-54-180-95-35.ap-northeast-2.compute.amazonaws.com:3000

# App Configuration
EXPO_PUBLIC_APP_SCHEME=com.shook.app
EXPO_LOCAL=true  # Enables platform-specific local URLs
```

### Backend Integration Points

**Shared Backend with Shook Web App**:
- Authentication: `/api/auth/google/mobile/verify`
- Video Summaries: `/api/videos` with delta sync support (`since` parameter)
- YouTube Channels: `/api/channels/user` and `/api/channels/search`
- Push Notifications: `/api/push/register` and `/api/push/unregister`

**Session Management**:
- Mobile app maintains session cookies with backend
- Authentication state synced between mobile and web
- Automatic notification registration/cleanup on login/logout

### Component Architecture

**Context Providers** (`src/contexts/ChannelsContext.tsx`):
- Provides channel data with real thumbnails for video summaries
- Prevents placeholder thumbnails in summary cards

**Custom Hooks Pattern**:
- `useVideoSummariesCached` - Hybrid caching with delta sync
- `useUserChannels` - Channel subscription management  
- `useGoogleAuth*` - Multiple Google OAuth implementations
- `useChannelSearch` - YouTube channel search with debouncing

**UI Components** (`src/components/`):
- `SummaryCard` - Video summary display with channel thumbnails
- `ChannelList` - Channel subscription management
- `GoogleSignInButton` - OAuth authentication
- Reusable UI components in `src/components/ui/`

### TypeScript Configuration & Path Aliases

**Strict TypeScript Setup** (`tsconfig.json:3-7`):
```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

**Path Alias Resolution** (`tsconfig.json:8-19`):
```json
"paths": {
  "@/*": ["./src/*", "./*"],
  "@/components/*": ["./components/*", "./src/components/*"],
  "@/services/*": ["./src/services/*"],
  "@/stores/*": ["./src/stores/*"],
  "@/hooks/*": ["./src/hooks/*"]
}
```

### Key Integration Considerations

**Mobile-Specific Auth Strategy**: Uses temporary mobile endpoints (`/api/auth/google/mobile/verify`) to bypass Google OAuth policy restrictions for mobile deep linking.

**Cache Performance Architecture**: 
- AsyncStorage provides instant UI loading (cached data loaded first)
- TanStack Query handles background synchronization with server
- Cache size limits: 500 videos max, 7-day retention (`src/services/video-cache.ts:39-40`)

**Real-time Updates via Push Notifications**: 
- Push notifications automatically trigger `queryClient.refetchQueries()` 
- Immediate delta sync and UI refresh without user intervention
- Notification service auto-registers on login, unregisters on logout

**Cross-platform URL Resolution**: 
- Android emulator requires special IP `10.0.2.2:3000`
- iOS simulator uses host machine IP `192.168.0.156:3000`
- Web development uses standard `localhost:3000`
- Production points to AWS EC2 instance

## Development Notes

### Platform-Specific Testing
- **Expo Go**: Rapid iteration, use for UI/UX testing
- **Physical Devices**: Required for push notifications, Google OAuth, production builds
- **Platform Emulators**: 
  - Android: Use `npm run android` (auto-detects emulator)
  - iOS: Use `npm run ios` (requires macOS + Xcode)
  - Web: Use `npm run web` for debugging React Native Web compatibility

### Cache Management Patterns
- Never clear AsyncStorage manually - use `videoCacheService.clearCache()`
- Cache automatically invalidates on user change (userId comparison)
- Monitor performance: `getCacheStats()` returns size, entry count, sync timestamps
- Cache strategies: 24-hour threshold determines full vs incremental sync

### TypeScript Development
- Strict mode enforced across codebase (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)  
- Path aliases configured for clean imports (`@/components`, `@/services`, etc.)
- Run `npx tsc --noEmit` before commits to catch type errors
- Zod schemas used for runtime validation of API responses

### Google OAuth Platform Requirements
- iOS: Requires `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` + URL scheme in `app.config.js`
- Android: Requires `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` + package name
- Web: Uses `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` for development testing
- Mobile auth flow bypasses web OAuth restrictions via backend token verification

## Logging System Architecture

This project uses a comprehensive React Native-compatible structured logging system with enhanced features for debugging, monitoring, and security.

### Enhanced Logger System

**Core Logger Implementation** (`src/utils/logger-enhanced.ts`):
- Custom React Native-compatible logger (replaces Winston for mobile compatibility)
- AsyncStorage persistence with daily log files
- Emoji-based categorization with structured metadata
- Environment-based log levels (DEBUG in __DEV__, WARN+ in production)
- Automatic sensitive data masking for tokens, passwords, secrets
- OpenTelemetry-compatible log structure
- High-precision timestamps with MM-DD HH:mm:ss format
- Correlation ID support for distributed tracing
- Performance measurement with timer utilities

**Available Logger Categories**:
```typescript
import { 
  apiLogger,           // 📡 API requests/responses
  cacheLogger,         // 📦 Cache operations
  notificationLogger,  // 🔔 Push notifications
  uiLogger,           // 🎨 UI interactions
  configLogger,       // ⚙️ Configuration
  serviceLogger,      // 🔧 Service operations
  authLogger          // 🔐 Authentication
} from '@/utils/logger-enhanced';
```

### HTTP Request Logging

**HTTP Client with Automatic Logging** (`src/utils/http-client.ts`):
- Automatic request/response logging for all HTTP calls
- Sensitive data masking in URLs and headers
- Distinguishes internal vs external API calls
- Performance timing for request duration
- Error handling with structured error metadata

```typescript
import { httpClient, googleApiClient } from '@/utils/http-client';

// Use instead of fetch() for automatic logging
const response = await httpClient.fetch('/api/channels', {
  method: 'POST',
  body: JSON.stringify(data),
  logResponseBody: true  // Optional: log response body
});
```

### Logging Best Practices & Guidelines

#### 1. Choose Appropriate Log Level
```typescript
// DEBUG: Development debugging, verbose information
authLogger.debug('Processing login request', { userId, method: 'google' });

// INFO: Normal application flow, important events
serviceLogger.info('Cache sync completed', { 
  syncType: 'incremental', 
  itemsUpdated: 15 
});

// WARN: Unexpected but recoverable conditions
cacheLogger.warn('Cache near size limit', { 
  currentSize: 480, 
  maxSize: 500 
});

// ERROR: Error conditions that need attention
apiLogger.error('External API call failed', { 
  url: 'https://api.example.com', 
  status: 500,
  error: error.message 
});
```

#### 2. Use Structured Metadata
```typescript
// ✅ Good: Structured metadata for searchability
authLogger.info('User login successful', {
  userId: user.id,
  method: 'google_oauth',
  platform: Platform.OS,
  sessionDuration: '24h'
});

// ❌ Bad: String interpolation loses structure
authLogger.info(`User ${user.id} logged in via Google OAuth`);
```

#### 3. Security-First Logging
```typescript
// ✅ Sensitive data is automatically masked
authLogger.debug('Token received', { 
  token: 'sk-1234567890abcdef',  // → 'sk-...def'
  refreshToken: response.refresh_token
});

// ✅ Use metadata for sensitive data (auto-masked)
apiLogger.info('API request authenticated', {
  authorization: request.headers.authorization,  // Auto-masked
  endpoint: '/api/secure-data'
});

// ❌ Avoid logging sensitive data in message strings
authLogger.info(`Token: ${token}`);  // Not auto-masked in message
```

#### 4. Performance Measurement
```typescript
// Method 1: Manual timer management
const timerId = serviceLogger.startTimer('video-cache-sync');
await performCacheSync();
serviceLogger.endTimer(timerId, 'Cache sync completed');

// Method 2: Automatic async timing
const result = await serviceLogger.timeAsync('api-call', async () => {
  return await httpClient.fetch('/api/videos');
});

// Method 3: Synchronous timing
const processedData = serviceLogger.timeSync('data-processing', () => {
  return processLargeDataSet(data);
});
```

#### 5. Error Handling Patterns
```typescript
// ✅ Comprehensive error logging with context
try {
  await riskyOperation();
} catch (error) {
  serviceLogger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });
  throw error;
}

// ✅ Service-specific error context
try {
  const response = await httpClient.fetch(url);
} catch (error) {
  apiLogger.error('HTTP request failed', {
    url,
    method: options.method || 'GET',
    status: error.status,
    error: error.message,
    duration: performance.now() - startTime
  });
}
```

#### 6. Category-Specific Usage Patterns

**API Logging** (`apiLogger`):
```typescript
// HTTP request start
apiLogger.info('API request started', { 
  url, method, headers: safeHeaders 
});

// HTTP response received  
apiLogger.info('API response received', { 
  status, duration, responseSize 
});

// Rate limiting
apiLogger.warn('Rate limit approached', { 
  remaining: headers['x-ratelimit-remaining'] 
});
```

**Cache Logging** (`cacheLogger`):
```typescript
// Cache operations
cacheLogger.debug('Cache hit', { key, size: data.length });
cacheLogger.info('Cache miss, fetching from source', { key });
cacheLogger.warn('Cache eviction triggered', { 
  reason: 'size_limit', 
  evictedKeys: keys.length 
});
```

**Authentication Logging** (`authLogger`):
```typescript
// Auth flow events
authLogger.info('Authentication started', { method: 'google' });
authLogger.info('Authentication successful', { userId, sessionId });
authLogger.warn('Authentication failed', { 
  method, reason: 'invalid_token' 
});
```

**Notification Logging** (`notificationLogger`):
```typescript
// Push notification events
notificationLogger.info('Push token registered', { userId });
notificationLogger.debug('Notification received', { 
  title: notification.title,
  data: notification.data 
});
```

### Common Migration Patterns

#### Replace Console Statements
```typescript
// ❌ Before: Basic console logging
console.log('User authenticated');
console.error('API call failed:', error);

// ✅ After: Structured logging with context
authLogger.info('User authenticated', { userId, method: 'google' });
apiLogger.error('API call failed', { 
  endpoint: '/api/videos',
  error: error.message,
  status: error.status 
});
```

#### HTTP Client Migration
```typescript
// ❌ Before: Manual fetch with basic logging
console.log('Calling API:', url);
const response = await fetch(url, options);
console.log('Response:', response.status);

// ✅ After: Automatic HTTP logging
const response = await httpClient.fetch(url, {
  ...options,
  logResponseBody: true  // Optional for detailed debugging
});
// Logs automatically: request details, timing, response status
```

### Performance Optimization

**Log Level Filtering**:
- Production: Only WARN and ERROR levels logged (performance optimized)
- Development: All levels logged including DEBUG and INFO
- Automatic filtering prevents performance impact in production

**Storage Management**:
- Daily log files with automatic cleanup (7-day retention)
- Maximum 100 entries per day to prevent storage bloat
- Async persistence doesn't block main thread

**Memory Efficiency**:
- Sensitive data masking prevents memory leaks of tokens
- Timer cleanup for expired performance measurements
- Correlation ID cleanup after request completion

### Quick Reference

**Essential Imports**:
```typescript
import { 
  apiLogger, 
  serviceLogger, 
  authLogger 
} from '@/utils/logger-enhanced';
import { httpClient } from '@/utils/http-client';
```

**Most Common Patterns**:
```typescript
// API calls - use httpClient (auto-logs)
const data = await httpClient.fetch('/api/endpoint');

// Service operations - use serviceLogger  
serviceLogger.info('Operation completed', { result, duration });

// Authentication - use authLogger
authLogger.info('Login successful', { userId, method });

// Errors - provide rich context
logger.error('Operation failed', { 
  operation: 'functionName',
  error: error.message,
  context: { userId, operation: 'specific-action' }
});

// Performance timing
const result = await serviceLogger.timeAsync('operation', asyncFunction);
```

This logging system provides comprehensive debugging capabilities while maintaining security and performance standards for production deployment.