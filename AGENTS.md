# SHOOK_APP Repository Guide

## Workspace Context
- This is the Expo client for the Shook product. Its sibling `../SHOOK_SERVER/` owns the API, database, monitoring, summarization, and push delivery.
- This directory is an independent Git repository on `master`. Read `../AGENTS.md` for the cross-repository contract before changing API, authentication, sync, notification, or shared domain behavior.

## Project Structure & Module Organization
- `app/` houses Expo Router screens/layouts (tabs, signup, SNS linking, settings, and summary detail) and drives navigation.
- `src/components/` holds reusable UI; `src/hooks/` for data/UX hooks; `src/services/` for API, notifications, and caching; `src/stores/` for Zustand state; `src/contexts/`, `src/lib/`, and `src/utils/` for shared plumbing.
- `assets/` stores static media; `docs/` for reference material; `android/` for native config; config roots include `app.config.js`, `metro.config.js`, and `tailwind.config.js`.

## Build, Test, and Development Commands
- `npm ci` to install dependencies exactly from `package-lock.json`.
- `npm run start` to launch the Expo dev server on port 19003 (use `start:tunnel` when USB/ADB is unavailable).
- `npm run android` / `npm run ios` / `npm run web` to open the app on each platform.
- `npm run lint` to run ESLint (Expo config) across TypeScript/JavaScript sources; fix warnings before sending changes.
- `npx tsc --noEmit` to run the strict TypeScript check used for local validation.

## Coding Style & Naming Conventions
- TypeScript-first; prefer functional React components and hooks for side effects/data fetching.
- 2-space indentation; favor descriptive camelCase for variables/functions, PascalCase for components, and kebab-case for files within `app/` routes (matching Expo Router expectations).
- Use `nativewind` utility classes for styling when possible; keep shared primitives in `src/components/ui/`.
- Keep business logic in hooks/services; keep components presentational where feasible.

## Testing Guidelines
- No automated test suite or `test` script is present. Run `npm run lint`; for type validation run `npx tsc --noEmit`.
- When adding tests, co-locate Jest/React Testing Library specs next to components (`ComponentName.test.tsx`) or under `__tests__/`, and add the runner/script before relying on them.
- For networked logic, prefer mocking service layers over live calls; ensure basic rendering and state transitions are covered.

## Commit & Pull Request Guidelines
- Write imperative, concise commit messages ("Add channel list empty state"); group related changes together.
- PRs should describe scope, rationale, and UI-impact (include screenshots or screen recordings for visual changes); link issues/Linear tickets when applicable.
- Ensure lint passes and that new routes/components follow existing folder patterns before requesting review.

## Security & Configuration Tips
- Keep secrets out of VCS; use an untracked `.env` for machine-specific values and mirror variable names in `.env.example` when adding config.
- Review `app.config.js`, `eas.json`, and `expo-env.d.ts` when touching build/profile settings or environment variables to keep schema and docs aligned.

## API, Authentication, and Sync Contract
- `app.config.js` exposes `extra.apiUrl`; `src/services/api.ts` is the client boundary. Production uses `EXPO_PUBLIC_API_URL_PRODUCTION`. Set `EXPO_PUBLIC_IS_LOCAL=true` to select Android `10.0.2.2` and iOS/web localhost addresses.
- `src/services/api.ts` sends JSON requests with `credentials: "include"`. Authentication is a server session cookie, not a locally attached Bearer token.
- Active authentication is Kakao via `@react-native-kakao/*` and `/api/auth/kakao/verify`, with guest accounts and ID/password login also supported. `src/stores/auth-store.ts`, `src/services/kakao-auth.ts`, `src/hooks/useKakaoAuth.ts`, and `src/components/ProtectedRoute.tsx` form the main client flow.
- Channel data flows through `useUserChannels*`, `ChannelsContext`, and channel caches. Videos use full/incremental/cursor sync through `video-summaries-sync.ts` and the video cache services. Keep user-specific caches isolated by numeric user ID.
- The push service registers `{ token, deviceId, platform, appVersion }`. A notification with `type: "new_video_summary"` triggers video refresh; `videoId` drives summary-detail navigation.
- Client domain types are partly duplicated in `src/services/api.ts` and `src/types/api.ts`; verify both against server responses before changing identifiers, nullability, dates, or pagination shapes.

## Current Configuration
- Required production variables are `EXPO_PUBLIC_API_URL_PRODUCTION` and `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`; `EXPO_PUBLIC_APP_SCHEME` is optional and defaults to `com.shook.app`.
- Values prefixed `EXPO_PUBLIC_` are bundled into the client and must never contain secrets.
- `README.md` contains stale Google OAuth and older dependency-version descriptions. Treat `package.json`, `app.config.js`, and current Kakao source files as authoritative.
- Do not edit or replace release artifacts such as `shook-production.aab` unless the task explicitly requests a build artifact.
