import 'dotenv/config';

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_LOCAL = process.env.EXPO_LOCAL === 'true';

// 환경별 API URL 설정
const getApiUrl = () => {
  if (IS_LOCAL) {
    // 로컬 개발시는 여러 주소를 시도할 수 있도록 객체로 반환
    return {
      android: 'http://10.0.2.2:3000',        // Android 에뮬레이터
      ios: 'http://192.168.0.156:3000',       // iOS 시뮬레이터 (실제 IP)
      web: 'http://localhost:3000',           // 웹
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
    slug: "shook-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.shook.app",
      infoPlist: {
        LSApplicationQueriesSchemes: ["kakaokompassauth", "kakaolink"],
        CFBundleURLTypes: [
          {
            CFBundleURLName: "kakao-login",
            CFBundleURLSchemes: [`kakao${process.env.EXPO_PUBLIC_KAKAO_APP_KEY}`]
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
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
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.441727275663-eqkgdijbp2mfbnk8jfrqja6uo9ul0ecd"
        }
      ],
      [
        "@react-native-seoul/kakao-login",
        {
          kakaoAppKey: process.env.EXPO_PUBLIC_KAKAO_APP_KEY,
          overrideKakaoSDKVersion: "2.11.2",
          kotlinVersion: "1.9.0"
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"]
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
      googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      kakaoAppKey: process.env.EXPO_PUBLIC_KAKAO_APP_KEY,
      appScheme: process.env.EXPO_PUBLIC_APP_SCHEME || "com.shook.app",
      isLocal: IS_LOCAL,
      isDev: IS_DEV,
      eas: {
        projectId: "a8839540-39ec-431e-a346-bdfdff731ecd"
      }
    }
  }
};