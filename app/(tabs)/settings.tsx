import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useGoogleAuth } from '@/hooks/useGoogleAuthTemp';
import { useAuthStore } from '@/stores/auth-store';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { signOut, isLoading } = useGoogleAuth();
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
            await signOut();
            router.replace('/auth-complex');
          },
        },
      ]
    );
  };

  const handleDeveloperToolsPress = () => {
    router.push('/developer-tools');
  };

  // Check if user has developer access (manager or tester)
  // Temporarily allow all users to see developer tools for debugging
  const hasDeveloperAccess = true; // user?.role === 'manager' || user?.role === 'tester';
  
  // Debug logging
  console.log('🔍 [SettingsScreen] User debug info:', {
    userId: user?.id,
    username: user?.username,
    email: user?.email,
    role: user?.role,
    hasDeveloperAccess,
    rawUser: user,
  });

  const settingsItems = [
    {
      title: '알림 설정',
      description: '푸시 알림 및 알림 주기를 설정합니다',
      onPress: () => {
        // TODO: Navigate to notification settings
      },
    },
    {
      title: '계정 정보',
      description: '계정 정보를 확인하고 수정합니다',
      onPress: () => {
        // TODO: Navigate to account settings
      },
    },
    {
      title: '앱 정보',
      description: '버전 정보 및 서비스 약관을 확인합니다',
      onPress: () => {
        // TODO: Navigate to app info
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: Math.max(24, tabBarHeight * 0.7) }}>
        <View style={styles.content}>

          {/* User Info */}
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              {user?.picture && (
                <Image 
                  source={{ uri: user.picture }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              )}
              <View style={styles.userDetails}>
                <Text style={styles.username}>
                  {user?.username || 'Unknown User'}
                </Text>
                {user?.email && (
                  <Text style={styles.email}>
                    {user.email}
                  </Text>
                )}
                <View style={styles.badgeContainer}>
                  <Text style={styles.badge}>
                    Google 계정으로 로그인됨
                  </Text>
                  {user?.verified && (
                    <Text style={[styles.badge, styles.verifiedBadge]}>
                      인증됨
                    </Text>
                  )}
                  {user?.role && (
                    <Text style={[styles.badge, styles.roleBadge]}>
                      {user.role === 'user' ? '사용자' : 
                       user.role === 'tester' ? '테스터' : 
                       user.role === 'manager' ? '관리자' : user.role}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

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

          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            disabled={isLoading}
            style={[styles.logoutButton, isLoading && styles.disabledButton]}
          >
            <Text style={styles.logoutText}>
              {isLoading ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingVertical: 24,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  verifiedBadge: {
    color: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  roleBadge: {
    color: '#7c3aed',
    backgroundColor: '#e9d5ff',
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
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});