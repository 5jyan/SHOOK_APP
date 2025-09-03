import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

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

  useEffect(() => {
    // Initialize enhanced systems
    const initializeApp = async () => {
      configLogger.info('App initialization started', { 
        loaded, 
        colorScheme 
      });
      
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
      
      if (loaded) {
        SplashScreen.hideAsync();
      }
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ChannelsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
            <Stack.Screen name="auth" options={{ 
              headerShown: false,
              presentation: 'modal' 
            }} />
            <Stack.Screen name="auth-complex" options={{ 
              headerShown: false,
              presentation: 'modal' 
            }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="summary-detail" options={{ headerShown: false }} />
            <Stack.Screen name="channel-search" options={{ headerShown: false }} />
            <Stack.Screen name="developer-tools" options={{ headerShown: false }} />
            <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
            <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
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
