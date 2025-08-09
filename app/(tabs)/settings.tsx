import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useGoogleAuth } from '@/hooks/useGoogleAuthTemp';
import { BackendTestButton } from '@/components/BackendTestButton';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { signOut, isLoading } = useGoogleAuth();

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
            router.replace('/auth');
          },
        },
      ]
    );
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>설정</Text>
          <Text style={styles.subtitle}>
            앱 설정 및 계정 관리
          </Text>

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
                </View>
              </View>
            </View>
          </View>

          {/* Backend Test Section */}
          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>개발자 도구</Text>
            <BackendTestButton />
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
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