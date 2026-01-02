import { initializeKakaoSDK } from '@react-native-kakao/core';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { FloatingDebugButton } from '@/components/FloatingDebugButton';
import { GlobalUIDebugger } from '@/components/GlobalUIDebugger';
import { ChannelsProvider } from '@/contexts/ChannelsContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { queryClient, restoreQueryClient } from '@/lib/query-client';
import { CacheTransaction } from '@/services/cache/CacheTransaction';
import { notificationService } from '@/services/notification';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { configLogger } from '@/utils/logger-enhanced';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAppReady, setIsAppReady] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const currentVersion = Constants.expoConfig?.version || Updates.manifest?.version || '0.0.0';
  const minSupportedVersion = Constants.expoConfig?.extra?.minSupportedVersion as string | undefined;
  const appStoreUrl = Constants.expoConfig?.extra?.appStoreUrl as string | undefined;
  const playStoreUrl = Constants.expoConfig?.extra?.playStoreUrl as string | undefined;

  const compareVersions = (a: string, b: string) => {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i += 1) {
      const aVal = aParts[i] ?? 0;
      const bVal = bParts[i] ?? 0;
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
    }
    return 0;
  };

  const requiresUpdate = minSupportedVersion
    ? compareVersions(currentVersion, minSupportedVersion) < 0
    : false;

  const openStore = async () => {
    const fallbackPlayUrl = Constants.expoConfig?.android?.package
      ? `market://details?id=${Constants.expoConfig.android.package}`
      : undefined;
    const url =
      Platform.OS === 'ios'
        ? appStoreUrl
        : playStoreUrl || fallbackPlayUrl;

    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      configLogger.error('Failed to open store URL', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
    }
  };

  // Auto-update on app foreground (background -> active)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Only check in production builds
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            configLogger.info('Update available, downloading...');
            await Updates.fetchUpdateAsync();
            configLogger.info('Update downloaded, reloading app...');
            await Updates.reloadAsync();
          }
        }
      } catch (error) {
        configLogger.error('Update check failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App moved from background to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        configLogger.info('App foregrounded, checking for updates');
        checkForUpdates();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize enhanced systems
    const initializeApp = async () => {
      configLogger.info('App initialization started', {
        loaded,
        colorScheme
      });

      // Initialize Kakao SDK
      try {
        const kakaoNativeAppKey = Constants.expoConfig?.extra?.kakaoNativeAppKey;
        if (kakaoNativeAppKey) {
          configLogger.info('Initializing Kakao SDK', {
            appKey: kakaoNativeAppKey.slice(0, 10) + '...'
          });
          await initializeKakaoSDK(kakaoNativeAppKey);
          configLogger.info('Kakao SDK initialized successfully');
        } else {
          configLogger.warn('Kakao Native App Key not found in config');
        }
      } catch (error) {
        configLogger.error('Kakao SDK initialization failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Initialize cache system with recovery
      try {
        configLogger.info('Initializing enhanced cache system');

        // Recover incomplete transactions from previous sessions
        await CacheTransaction.recoverIncompleteTransactions();

        // Initialize enhanced cache service (includes auto-recovery)
        await videoCacheService.getCacheStats(); // Triggers initialization

        configLogger.info('Cache system initialized successfully');
      } catch (error) {
        configLogger.error('Cache initialization failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Restore persisted queries
      restoreQueryClient();

      setIsAppReady(true);
    };
    
    // Setup notification listeners
    const listeners = notificationService.addNotificationListeners();
    
    // Initialize app systems
    initializeApp();

    return () => {
      // Cleanup notification listeners on unmount
      notificationService.removeNotificationListeners(listeners);
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (requiresUpdate) {
    return (
      <View style={styles.forceUpdateContainer}>
        <View style={styles.forceUpdateCard}>
          <Text style={styles.forceUpdateTitle}>업데이트가 필요합니다</Text>
          <Text style={styles.forceUpdateDescription}>
            안정적인 사용을 위해 최신 버전으로 업데이트해주세요.
          </Text>
          <Pressable style={styles.forceUpdateButton} onPress={openStore}>
            <Text style={styles.forceUpdateButtonText}>업데이트</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isAppReady) {
    return (
      <View style={styles.startupContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ChannelsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
              <Stack.Screen name="+not-found" />
              <Stack.Screen name="summary-detail" options={{ headerShown: false }} />
              <Stack.Screen 
                name="channel-search" 
                options={{ 
                  headerShown: false,
                  animation: 'slide_from_right',
                  animationDuration: 300
                }} 
              />
              <Stack.Screen name="developer-tools" options={{ headerShown: false }} />
              <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
              <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
              <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
              <Stack.Screen name="sns-link" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" />
            <FloatingDebugButton />
            <GlobalUIDebugger />
          </ThemeProvider>
        </ChannelsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  startupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  forceUpdateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  forceUpdateCard: {
    width: '100%',
    maxWidth: 320,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    alignItems: 'center',
  },
  forceUpdateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  forceUpdateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  forceUpdateButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#4285f4',
    borderRadius: 999,
  },
  forceUpdateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
