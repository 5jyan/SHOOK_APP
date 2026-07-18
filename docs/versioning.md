# Shook 앱 버전 및 배포 규칙

## 버전의 역할

Shook의 사용자 표시 버전은 `MAJOR.MINOR.PATCH` 형식을 사용한다. `app.config.js`의
`expo.version`을 기준값으로 삼고, Store 릴리스 시 `package.json`의 `version`도 같은
값으로 맞춘다.

- `MAJOR`: 계정, 데이터 또는 핵심 사용자 흐름의 호환성을 깨는 대규모 변경
- `MINOR`: 기존 사용 흐름과 호환되는 새로운 사용자 기능
- `PATCH`: 버그 수정, UI/UX 개선, 성능 및 안정성 개선

## Store 릴리스

새 네이티브 바이너리를 App Store 또는 Play Store에 제출할 때만 사용자 표시 버전을
올린다. iOS `buildNumber`와 Android `versionCode`는 Store 업로드마다 EAS의 remote
version 및 `autoIncrement`로 증가시킨다.

Store 릴리스 전에는 다음을 확인한다.

1. 변경 성격에 따라 `MAJOR`, `MINOR`, `PATCH` 중 하나를 올린다.
2. `app.config.js`와 `package.json`의 버전을 일치시킨다.
3. `runtimeVersion`은 `appVersion` 정책에서 새 앱 버전으로 자동 결정되게 한다.
4. 앱 검증 후 `app-vX.Y.Z` 형식의 Git 태그를 만든다.
5. 릴리스 노트에 사용자 영향과 필요한 서버 호환성을 기록한다.

네이티브 의존성, Expo config plugin, 권한, entitlement, 네이티브 리소스 또는 네이티브
빌드 설정이 바뀌면 OTA만 배포하지 않고 새 Store 빌드를 만든다.

## OTA 업데이트

현재 Store 바이너리의 네이티브 runtime과 호환되는 JavaScript, 스타일, 문구 및 번들
에셋 변경은 기존 앱 버전을 유지한 채 EAS Update로 배포한다.

- production 배포 전 preview 채널에서 같은 runtime으로 확인한다.
- production OTA 메시지는 변경 목적을 알 수 있게 작성한다.
- OTA를 구분하기 위해 앱 버전을 올리지 않는다. EAS Update ID와 Git 커밋을 기록으로
  사용한다.
- 긴급 수정이 아니라면 단계적 rollout을 우선 검토한다.
- 문제가 발생하면 직전 안정 업데이트로 rollback한다.

이미 배포된 바이너리의 runtime이 현재 앱 버전과 다른 과거 릴리스에 긴급 OTA를 보낼
때만 `EXPO_RUNTIME_VERSION_OVERRIDE`를 사용한다. 이 값은 해당 Store 빌드의 EAS
build 정보에서 확인하며, 일반 빌드와 신규 Store 릴리스에서는 설정하지 않는다.

## 강제 업데이트

`extra.minSupportedVersion`은 보안 문제, 서버 호환성 단절 또는 복구 불가능한 데이터
문제가 있을 때만 올린다. 일반 기능 릴리스나 UI 변경에는 사용하지 않는다.

## 현재 기준

- 앱 버전: `1.1.3`
- production 채널: Store 사용자 대상
- preview 채널: production 배포 전 내부 확인 대상
- runtime 정책: `appVersion`
