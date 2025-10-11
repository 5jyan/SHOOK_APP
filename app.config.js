import 'dotenv/config';

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_LOCAL = process.env.EXPO_LOCAL === 'true';

// 환경별 API URL 설정
const getApiUrl = () => {
  if (IS_LOCAL) {
    // 로컬 개발시는 여러 주소를 시도할 수 있도록 객체로 반환
    return {
      android: 'http://192.168.0.156:3000',        // Android 에뮬레이터
      ios: 'http://192.168.0.156:3000',       // iOS 시뮬레이터 (실제 IP)
      web: 'http://192.168.0.156:3000',           // 웹
      default: 'http://192.168.0.156:3000'    // 기본값 (실제 IP)
    };
  }
  if (IS_DEV) {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  }
  return process.env.EXPO_PUBLIC_API_URL_PRODUCTION || 'http://ec2-54-180-95-35.ap-northeast-2.compute.amazonaws.com:3000';
};

export default {
  expo: {
    name: "Shook",
    slug: "shook",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/Shook.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/shook_256.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      url: "https://u.expo.dev/a8839540-39ec-431e-a346-bdfdff731ecd"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.shook.app",
      usesNonExemptEncryption: false,
      splash: {
        image: "./assets/images/shook_256.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        tabletImage: "./assets/images/shook_256.png"
      },
      infoPlist: {
        LSApplicationQueriesSchemes: ["kakaokompassauth", "kakaolink"],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [`kakao${process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY}`],
            CFBundleURLName: "com.kakao.sdk"
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/Shook.png",
        backgroundColor: "#ffffff"
      },
      splash: {
        image: "./assets/images/shook_256.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
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
          nativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
          ios: {
            handleKakaoOpenUrl: true
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // 환경별 설정을 extra에 추가
      apiUrl: getApiUrl(),
      kakaoNativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
      appScheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
      isLocal: IS_LOCAL,
      isDev: IS_DEV,
      eas: {
        projectId: "a8839540-39ec-431e-a346-bdfdff731ecd"
      }
    }
  }
};