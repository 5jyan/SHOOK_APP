#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" ]]; then
  echo "Usage: $0 <android|ios>" >&2
  exit 2
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="$(cd "$APP_DIR/../SHOOK_SERVER" && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://shook:shook_local_test@127.0.0.1:54329/shook_test}"
E2E_API_PORT="${E2E_API_PORT:-3100}"
JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export JAVA_HOME
export ANDROID_HOME ANDROID_SDK_ROOT
export PATH="$JAVA_HOME/bin:$PATH"

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "Java 17 not found at $JAVA_HOME. Install it with: brew install openjdk@17" >&2
  exit 1
fi
if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is not installed" >&2
  exit 1
fi
if lsof -nP -iTCP:"$E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $E2E_API_PORT is already in use. Stop the existing server or set E2E_API_PORT." >&2
  exit 1
fi

RUN_ID="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_REL="artifacts/maestro/$RUN_ID/$PLATFORM"
ARTIFACT_DIR="$APP_DIR/$ARTIFACT_REL"
mkdir -p "$ARTIFACT_DIR"

if [[ "$PLATFORM" == "android" ]]; then
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  DEVICE_ID="${MAESTRO_DEVICE_ID:-$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')}"
  if [[ -z "$DEVICE_ID" ]]; then
    echo "No running Android emulator found" >&2
    exit 1
  fi
  adb -s "$DEVICE_ID" reverse "tcp:$E2E_API_PORT" "tcp:$E2E_API_PORT"
  adb -s "$DEVICE_ID" reverse tcp:3000 "tcp:$E2E_API_PORT"
  EXCLUDE_ANDROID_FLOW=false
else
  DEVICE_ID="${MAESTRO_DEVICE_ID:-$(xcrun simctl list devices booted -j | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next((x["udid"] for values in d["devices"].values() for x in values if x.get("state") == "Booted"), ""))')}"
  if [[ -z "$DEVICE_ID" ]]; then
    echo "No booted iOS simulator found" >&2
    exit 1
  fi
  EXCLUDE_ANDROID_FLOW=true
fi

if [[ "$PLATFORM" == "android" ]]; then
  adb -s "$DEVICE_ID" shell pm path com.shook.app >/dev/null 2>&1 || {
    echo "com.shook.app is not installed on $DEVICE_ID" >&2
    exit 1
  }
else
  xcrun simctl get_app_container "$DEVICE_ID" com.shook.app app >/dev/null 2>&1 || {
    echo "com.shook.app is not installed on $DEVICE_ID" >&2
    exit 1
  }
fi

if [[ "${E2E_SKIP_BUILD:-false}" != "true" ]]; then
  export EXPO_PUBLIC_IS_LOCAL=true
  export EXPO_PUBLIC_E2E_MODE=true
  export EXPO_PUBLIC_E2E_API_PORT="$E2E_API_PORT"
  export EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=e2e-placeholder
  if [[ "$PLATFORM" == "android" ]]; then
    (cd "$APP_DIR" && npx expo prebuild --platform android --no-install) >"$ARTIFACT_DIR/build.log" 2>&1
    (cd "$APP_DIR/android" && ./gradlew app:installRelease) >>"$ARTIFACT_DIR/build.log" 2>&1
  else
    IOS_DERIVED_DATA="$APP_DIR/ios/build-e2e"
    xcodebuild \
      -workspace "$APP_DIR/ios/Shook.xcworkspace" \
      -scheme Shook \
      -configuration Release \
      -sdk iphonesimulator \
      -destination "id=$DEVICE_ID" \
      -derivedDataPath "$IOS_DERIVED_DATA" \
      ONLY_ACTIVE_ARCH=YES \
      ARCHS=arm64 \
      build >"$ARTIFACT_DIR/build.log" 2>&1
    xcrun simctl install "$DEVICE_ID" "$IOS_DERIVED_DATA/Build/Products/Release-iphonesimulator/Shook.app"
  fi
fi

SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

(
  cd "$SERVER_DIR"
  E2E_MODE=true DATABASE_URL="$DATABASE_URL" SLACK_ENABLED=false npm run e2e:reset-seed
)

(
  cd "$SERVER_DIR"
  E2E_MODE=true \
  NODE_ENV=development \
  PORT="$E2E_API_PORT" \
  DATABASE_URL="$DATABASE_URL" \
  SESSION_SECRET=e2e-session-secret-012345678901234 \
  SLACK_ENABLED=false \
  YOUTUBE_API_KEY= \
  OPENAI_API_KEY= \
  npx tsx server/index.ts
) >"$ARTIFACT_DIR/server.log" 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl --fail --silent "http://127.0.0.1:$E2E_API_PORT/api/health" >/dev/null; then
    break
  fi
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "E2E server exited before becoming healthy. See $ARTIFACT_DIR/server.log" >&2
    exit 1
  fi
  sleep 1
done
curl --fail --silent "http://127.0.0.1:$E2E_API_PORT/api/health" >/dev/null || {
  echo "E2E server did not become healthy. See $ARTIFACT_DIR/server.log" >&2
  exit 1
}

cd "$APP_DIR"
MAESTRO_COMMAND=(maestro --device "$DEVICE_ID" test .maestro --config .maestro/config.yaml)
if [[ "$EXCLUDE_ANDROID_FLOW" == true ]]; then
  MAESTRO_COMMAND+=(--exclude-tags=android-only)
fi
MAESTRO_COMMAND+=(
  --format junit
  --output "$ARTIFACT_REL/report.xml"
  --test-output-dir "$ARTIFACT_REL"
  --debug-output "$ARTIFACT_REL"
  --flatten-debug-output
)
"${MAESTRO_COMMAND[@]}" \
  2>&1 | tee "$ARTIFACT_DIR/console.log"

echo "Maestro $PLATFORM artifacts: $ARTIFACT_DIR"
