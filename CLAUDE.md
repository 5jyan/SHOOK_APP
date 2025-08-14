# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Shook Mobile App** - an Expo React Native application that serves as the mobile companion to the Shook web application. It provides YouTube channel monitoring and AI-powered video summaries with push notification support.

**Tech Stack**: Expo SDK 53 + React Native + TypeScript + Zustand + TanStack Query + AsyncStorage

## Development Commands

```bash
# Development
npm start                   # Start Expo dev server on port 19003
npx expo start             # Alternative start command
npm run android            # Start on Android
npm run ios                # Start on iOS  
npm run web                # Start web version

# Linting
npm run lint               # Run Expo linting

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

**Delta Sync Strategy** (`src/hooks/useVideoSummariesCached.ts`):
```typescript
// Incremental sync - get only new videos since lastSyncTimestamp
const serverResponse = await apiService.getVideoSummaries(lastSyncTimestamp);
const finalVideos = await videoCacheService.mergeVideos(newVideos);
```

**Push Notification to Data Sync** (`src/services/notification.ts:308-336`):
```typescript
if (data?.type === 'new_video_summary') {
  // Automatic backend query when push received
  queryClient.refetchQueries({
    queryKey: ['videoSummariesCached']
  });
}
```

**Manual Refetch on Tab Focus** (`app/(tabs)/summaries.tsx:45-50`):
```typescript
React.useEffect(() => {
  if (isFocused) {
    refetch(); // Trigger delta sync when summary tab focused
  }
}, [isFocused, refetch]);
```

### Environment Configuration

Required environment variables in `.env`:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://192.168.0.156:3000
EXPO_PUBLIC_APP_SCHEME=com.shook.app
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

### Key Integration Considerations

**Mobile-Specific Auth Strategy**: Uses temporary mobile endpoints to bypass Google OAuth policy restrictions for mobile deep linking.

**Cache Performance**: AsyncStorage provides instant UI loading while TanStack Query handles background synchronization.

**Real-time Updates**: Push notifications trigger immediate delta sync and UI refresh without user intervention.

**Cross-platform Compatibility**: Single codebase supports iOS, Android, and web through Expo Router and React Native Web.

## Development Notes

### Testing Environment
- Use Expo Go for rapid iteration during development
- Physical devices required for push notification testing
- Web version available for debugging web-specific features

### Cache Management
- Never clear AsyncStorage cache manually - use `videoCacheService.clearCache()`
- Cache automatically invalidates on user change
- Monitor cache size and performance via `getCacheStats()`

### Push Notification Development
- Mock tokens generated for development/simulator environments
- Real push tokens only available on physical devices
- Test notification flow using `PushNotificationTestButton` component