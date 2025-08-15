import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
              },
              default: {},
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
