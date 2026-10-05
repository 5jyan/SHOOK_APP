import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useNavigation } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TEST_IDS } from '@/constants/test-ids';
import { SummaryTheme } from '@/constants/SummaryTheme';

export default function TabLayout() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

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
            tabBarActiveTintColor: SummaryTheme.colors.textPrimary,
            tabBarInactiveTintColor: SummaryTheme.colors.textMuted,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarAllowFontScaling: false,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              marginBottom: Platform.OS === 'android' ? 4 : 2,
            },
            tabBarItemStyle: Platform.OS === 'android'
              ? { transform: [{ translateY: -10 }] }
              : undefined,
            tabBarStyle: Platform.select({
              ios: {
                position: 'absolute',
                backgroundColor: SummaryTheme.colors.surface,
                paddingBottom: bottomInset,
                height: 50 + bottomInset,
                borderTopWidth: 1,
                borderTopColor: SummaryTheme.colors.border,
              },
              android: {
                backgroundColor: SummaryTheme.colors.surface,
                paddingBottom: bottomInset,
                height: 63 + bottomInset,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: SummaryTheme.colors.border,
              },
              default: {
                backgroundColor: SummaryTheme.colors.surface,
                paddingBottom: bottomInset,
                height: 53 + bottomInset,
                borderTopWidth: 1,
                borderTopColor: SummaryTheme.colors.border,
              },
            }),
          }}>
          <Tabs.Screen
            name="channels"
            options={{
              title: '채널',
              tabBarButtonTestID: TEST_IDS.tabs.channels,
              tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="youtube" color={color} />,
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
              title: '구독 요약',
              tabBarButtonTestID: TEST_IDS.tabs.summaries,
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="video-request"
            options={{
              title: '영상 요약',
              tabBarButtonTestID: TEST_IDS.tabs.videoRequest,
              tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="movie-open-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: '설정',
              tabBarButtonTestID: TEST_IDS.tabs.settings,
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
            }}
          />
      </Tabs>
    </ProtectedRoute>
  );
}
