# Repository Guidelines

## Project Structure & Module Organization
- `app/` houses Expo Router screens/layouts (tabs, auth flows) and drives navigation.
- `src/components/` holds reusable UI; `src/hooks/` for data/UX hooks; `src/services/` for API, notifications, and caching; `src/stores/` for Zustand state; `src/contexts/`, `src/lib/`, and `src/utils/` for shared plumbing.
- `assets/` stores static media; `docs/` for reference material; `android/` for native config; config roots include `app.config.js`, `metro.config.js`, and `tailwind.config.js`.

## Build, Test, and Development Commands
- `npm install` to sync dependencies.
- `npm run start` to launch the Expo dev server on port 19003 (use `start:tunnel` when USB/ADB is unavailable).
- `npm run android` / `npm run ios` / `npm run web` to open the app on each platform.
- `npm run lint` to run ESLint (Expo config) across TypeScript/JavaScript sources; fix warnings before sending changes.

## Coding Style & Naming Conventions
- TypeScript-first; prefer functional React components and hooks for side effects/data fetching.
- 2-space indentation; favor descriptive camelCase for variables/functions, PascalCase for components, and kebab-case for files within `app/` routes (matching Expo Router expectations).
- Use `nativewind` utility classes for styling when possible; keep shared primitives in `src/components/ui/`.
- Keep business logic in hooks/services; keep components presentational where feasible.

## Testing Guidelines
- No automated test suite is present; when adding tests, co-locate Jest/React Testing Library specs next to components (`ComponentName.test.tsx`) or under `__tests__/`.
- For networked logic, prefer mocking service layers over live calls; ensure basic rendering and state transitions are covered.

## Commit & Pull Request Guidelines
- Write imperative, concise commit messages ("Add channel list empty state"); group related changes together.
- PRs should describe scope, rationale, and UI-impact (include screenshots or screen recordings for visual changes); link issues/Linear tickets when applicable.
- Ensure lint passes and that new routes/components follow existing folder patterns before requesting review.

## Security & Configuration Tips
- Keep secrets out of VCS; use `.env.local` for machine-specific values and mirror keys in `.env.example` when adding new config.
- Review `app.config.js`, `eas.json`, and `expo-env.d.ts` when touching build/profile settings or environment variables to keep schema and docs aligned.
