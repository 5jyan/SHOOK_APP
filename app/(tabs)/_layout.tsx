import { useFocusEffect } from '@react-navigation/native';
import { Tabs, useNavigation } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const onBackPress = () => {
        if (navigation.canGoBack()) {
          return false;
        }

        Alert.alert('Exit app', 'Close the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  return (
    <ProtectedRoute>
      <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarStyle: Platform.select({
              ios: {
                position: 'absolute',
                paddingBottom: bottomInset,
                height: 62 + bottomInset,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
              },
              android: {
                paddingBottom: bottomInset,
                height: 57 + bottomInset,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
              },
              default: {
                paddingBottom: bottomInset,
                height: 57 + bottomInset,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
              },
            }),
          }}>
          <Tabs.Screen
            name="channels"
            options={{
              title: '채널',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="play.rectangle.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="index"
            options={{
              href: null, // Hide from tab bar
            }}
          />
          <Tabs.Screen
            name="summaries"
            options={{
              title: '요약',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: '설정',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
            }}
          />
      </Tabs>
    </ProtectedRoute>
  );
}
