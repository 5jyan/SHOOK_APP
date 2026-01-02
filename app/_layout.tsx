import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { queryClient, restoreQueryClient } from '@/lib/query-client';
import { notificationService } from '@/services/notification';
import { ChannelsProvider } from '@/contexts/ChannelsContext';
import { GlobalUIDebugger } from '@/components/GlobalUIDebugger';
import { FloatingDebugButton } from '@/components/FloatingDebugButton';
import { configLogger } from '@/utils/logger-enhanced';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { CacheTransaction } from '@/services/cache/CacheTransaction';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAppReady, setIsAppReady] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

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
});
