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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Restore persisted queries
    restoreQueryClient();
    
    // Setup notification listeners
    const listeners = notificationService.addNotificationListeners();
    
    if (loaded) {
      SplashScreen.hideAsync();
    }

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
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </ChannelsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
