# Maestro E2E regression tests

Start PostgreSQL and boot the target emulator or simulator, then run one command:

```bash
npm run e2e:android
npm run e2e:ios
```

Each command creates an isolated temporary native project, builds and installs an E2E-only app, resets and seeds `shook_test`, starts the local API without external YouTube/OpenAI calls, and runs the ordered Maestro flows. The repository's ignored `android/` and `ios/` directories are never modified. Android uses ADB reverse; iOS uses the booted simulator. The default API port is `3100` and can be changed with `E2E_API_PORT`.

For repeated flow-only debugging after a successful build, set `E2E_SKIP_BUILD=true`. This is an iteration shortcut; regression verification should use the default build-inclusive command.

After the online flows pass, the runner stops the API and relaunches the app to prove that the persisted session state and channel/summary caches work offline. JUnit reports, build/server/console logs, Maestro command traces, and failure screenshots are written under `artifacts/maestro/<timestamp>/<platform>/`. The artifact directory is intentionally ignored by Git.
