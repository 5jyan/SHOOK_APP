import 'dotenv/config';

const IS_LOCAL = process.env.EXPO_LOCAL === 'false';

// API URL config
const getApiUrl = () => {
  if (IS_LOCAL) {
    return {
      android: 'http://10.0.2.2:3000',
      ios: 'http://localhost:3000',
      web: 'http://localhost:3000',
      default: 'http://localhost:3000'
    };
  }
  return process.env.EXPO_PUBLIC_API_URL_PRODUCTION;
};

export default {
  expo: {
    name: "Shook",
    slug: "shook",
    version: "1.1.2",
    orientation: "portrait",
    icon: "./assets/images/Shook.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/shook_256_pad.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      url: "https://u.expo.dev/a8839540-39ec-431e-a346-bdfdff731ecd"
    },
    runtimeVersion: "1.1.2",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.shook.app",
      usesNonExemptEncryption: false,
      splash: {
        image: "./assets/images/shook_256_pad.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        tabletImage: "./assets/images/shook_256_pad.png"
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
        image: "./assets/images/shook_256_pad.png",
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
      ],
      "./app.plugin.js"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiUrl: getApiUrl(),
      kakaoNativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
      appScheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
      isLocal: IS_LOCAL,
      minSupportedVersion: "1.1.1",
      appStoreUrl: "https://apps.apple.com/kr/app/shook-%EC%9C%A0%ED%8A%9C%EB%B8%8C-%EC%83%88-%EC%98%81%EC%83%81-%EC%9A%94%EC%95%BD-%EC%95%8C%EB%A6%BC/id6753907638",
      playStoreUrl: null,
      eas: {
        projectId: "a8839540-39ec-431e-a346-bdfdff731ecd"
      }
    }
  }
};
