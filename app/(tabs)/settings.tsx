import { TabHeader } from '@/components/AppHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const tabBarHeight = useBottomTabOverflow();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await apiService.logout();
              logout();
              router.replace('/auth');
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeveloperToolsPress = () => {
    router.push('/developer-tools');
  };

  // Check if user has developer access (manager or tester)
  const hasDeveloperAccess = user?.role === 'manager' || user?.role === 'tester';
  
  // Debug logging
  uiLogger.debug('[SettingsScreen] User debug info', {
    userId: user?.id,
    username: user?.username,
    email: user?.email,
    role: user?.role,
    hasDeveloperAccess
  });

  const settingsItems = [
    {
      title: '알림 설정',
      description: '푸시 알림 및 알림 주기를 설정합니다',
      onPress: () => {
        router.push('/notification-settings');
      },
    },
    {
      title: '개인정보처리방침',
      description: '개인정보 수집 및 이용에 관한 방침을 확인합니다',
      onPress: () => {
        router.push('/privacy-policy');
      },
    },
    {
      title: '서비스 이용약관',
      description: '서비스 이용에 관한 약관을 확인합니다',
      onPress: () => {
        router.push('/terms-of-service');
      },
    },
    {
      title: '앱 정보',
      description: '버전 정보 및 앱 개발자 정보를 확인합니다',
      onPress: () => {
        Alert.alert(
          'Shook 앱 정보',
          `버전: 1.0.0\n개발자: Saul Park\n문의: saulpark12@gmail.com\n\n© 2025 Shook. All rights reserved.`,
          [{ text: '확인' }]
        );
      },
    },
  ];

  // Developer tools item (only for manager/tester)
  const developerToolsItem = {
    title: '개발자 도구',
    description: '개발 및 테스트를 위한 도구들입니다',
    onPress: handleDeveloperToolsPress,
  };

  return (
    <SafeAreaView style={styles.container}>
      <TabHeader
        title="설정"
        rightComponent={
          <TouchableOpacity onPress={handleLogout} disabled={isLoading} style={styles.logoutButton}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#374151" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: Math.max(24, tabBarHeight * 0.7) }}>
        <View style={styles.content}>
          {/* Settings Items */}
          <View style={styles.settingsContainer}>
            {settingsItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={item.onPress}
                style={styles.settingItem}
              >
                <Text style={styles.settingTitle}>
                  {item.title}
                </Text>
                <Text style={styles.settingDescription}>
                  {item.description}
                </Text>
              </Pressable>
            ))}
            
            {/* Developer Tools Button (only for manager/tester) */}
            {hasDeveloperAccess && (
              <Pressable
                onPress={developerToolsItem.onPress}
                style={[styles.settingItem, styles.developerToolsItem]}
              >
                <Text style={styles.settingTitle}>
                  {developerToolsItem.title}
                </Text>
                <Text style={styles.settingDescription}>
                  {developerToolsItem.description}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingVertical: 24,
  },
  settingsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  developerToolsItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  }
});