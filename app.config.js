import 'dotenv/config';
import { existsSync } from 'node:fs';

const IS_LOCAL = process.env.EXPO_PUBLIC_IS_LOCAL === 'true';
const IS_E2E = process.env.EXPO_PUBLIC_E2E_MODE === 'true';
const LOCAL_API_PORT = IS_E2E ? (process.env.EXPO_PUBLIC_E2E_API_PORT || '3100') : '3000';
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || 'eas-config-placeholder';
const LOCAL_GOOGLE_SERVICES_FILE = './google-services.json';
const GOOGLE_SERVICES_FILE = process.env.GOOGLE_SERVICES_JSON ||
  (existsSync(LOCAL_GOOGLE_SERVICES_FILE) ? LOCAL_GOOGLE_SERVICES_FILE : undefined);

if (!IS_LOCAL && IS_E2E) {
  throw new Error('EXPO_PUBLIC_E2E_MODE=true requires EXPO_PUBLIC_IS_LOCAL=true');
}

if (process.env.EAS_BUILD === 'true' && process.env.EAS_BUILD_PLATFORM === 'android' && !GOOGLE_SERVICES_FILE) {
  throw new Error('Android EAS builds require a GOOGLE_SERVICES_JSON file environment variable');
}

if (process.env.EAS_BUILD === 'true' && !process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY) {
  throw new Error('EAS builds require EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY');
}

// API URL config
const getApiUrl = () => {
  if (IS_LOCAL) {
    return {
      android: `http://${IS_E2E ? '127.0.0.1' : '10.0.2.2'}:${LOCAL_API_PORT}`,
      ios: `http://127.0.0.1:${LOCAL_API_PORT}`,
      web: `http://127.0.0.1:${LOCAL_API_PORT}`,
      default: `http://127.0.0.1:${LOCAL_API_PORT}`
    };
  }
  return process.env.EXPO_PUBLIC_API_URL_PRODUCTION;
};

export default {
  expo: {
    name: "Shook",
    slug: "shook",
    version: "1.1.3",
    orientation: "portrait",
    icon: "./assets/images/Shook.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/Shook.png",
      resizeMode: "contain",
      backgroundColor: "#101013"
    },
    updates: {
      enabled: !IS_E2E,
      url: "https://u.expo.dev/a8839540-39ec-431e-a346-bdfdff731ecd"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.shook.app",
      usesNonExemptEncryption: false,
      splash: {
        image: "./assets/images/Shook.png",
        resizeMode: "contain",
        backgroundColor: "#101013",
        tabletImage: "./assets/images/Shook.png"
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["kakaokompassauth", "kakaolink"],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [`kakao${KAKAO_NATIVE_APP_KEY}`],
            CFBundleURLName: "com.kakao.sdk"
          }
        ]
      }
    },
    android: {
      ...(GOOGLE_SERVICES_FILE ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
      usesCleartextTraffic: IS_E2E,
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/Shook-icon-foreground.png",
        backgroundColor: "#ffffff"
      },
      splash: {
        image: "./assets/images/Shook.png",
        resizeMode: "contain",
        backgroundColor: "#101013"
      },
      package: "com.shook.app"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/Shook.png",
          imageWidth: 100,
          resizeMode: "contain",
          backgroundColor: "#101013",
          dark: {
            image: "./assets/images/Shook.png",
            backgroundColor: "#101013"
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ],
      [
        "@react-native-kakao/core",
        {
          nativeAppKey: KAKAO_NATIVE_APP_KEY,
          ios: {
            handleKakaoOpenUrl: true
          }
        }
      ],
      "./app.plugin.js"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiUrl: getApiUrl(),
      kakaoNativeAppKey: KAKAO_NATIVE_APP_KEY,
      appScheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
      isLocal: IS_LOCAL,
      isE2E: IS_E2E,
      minSupportedVersion: "1.1.1",
      appStoreUrl: "https://apps.apple.com/kr/app/shook-%EC%9C%A0%ED%8A%9C%EB%B8%8C-%EC%83%88-%EC%98%81%EC%83%81-%EC%9A%94%EC%95%BD-%EC%95%8C%EB%A6%BC/id6753907638",
      playStoreUrl: null,
      eas: {
        projectId: "a8839540-39ec-431e-a346-bdfdff731ecd"
      }
    }
  }
};
