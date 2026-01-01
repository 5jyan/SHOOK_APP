import { TabHeader } from '@/components/AppHeader';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { apiService } from '@/services/api';
import { kakaoAuthService } from '@/services/kakao-auth';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user, logout, login } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLinkingKakao, setIsLinkingKakao] = React.useState(false);
  const tabBarHeight = useBottomTabOverflow();


  const handleLinkKakaoAccount = () => {
    Alert.alert(
      '카카오 계정 연동',
      '게스트 계정을 카카오 계정으로 연동하시겠습니까?\n\n모든 구독 채널과 데이터가 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연동하기',
          onPress: async () => {
            try {
              setIsLinkingKakao(true);
              uiLogger.info('[SettingsScreen] Starting guest to Kakao link');

              const kakaoResult = await kakaoAuthService.signIn();
              const backendUser = await apiService.verifyKakaoToken(
                kakaoResult.accessToken,
                true
              );

              login({
                id: backendUser.id.toString(),
                username: backendUser.username || backendUser.name || kakaoResult.user.name,
                email: backendUser.email || kakaoResult.user.email || undefined,
                role: backendUser.role,
                isGuest: backendUser.isGuest,
                picture: kakaoResult.user.profileImage || undefined,
              });

              await AsyncStorage.removeItem('channel_list_changed');

              Alert.alert(
                '연동 완료',
                '카카오 계정으로 연동되었습니다!\n이제 카카오 계정으로 로그인할 수 있습니다.',
                [{ text: '확인' }]
              );
            } catch (error) {
              uiLogger.error('[SettingsScreen] Kakao link failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              Alert.alert(
                '연동 실패',
                '계정 연동 중 오류가 발생했습니다.\n다시 시도해주세요.'
              );
            } finally {
              setIsLinkingKakao(false);
            }
          },
        },
      ]
    );
  };

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
              router.replace('/');
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

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말 회원 탈퇴하시겠습니까?\n\n모든 데이터가 영구적으로 삭제되며, 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            // 2차 확인
            Alert.alert(
              '최종 확인',
              '정말로 회원 탈퇴를 진행하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '확인',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setIsLoading(true);
                      const response = await apiService.deleteAccount();

                      if (response.success) {
                        Alert.alert('회원 탈퇴 완료', '회원 탈퇴가 완료되었습니다.', [
                          {
                            text: '확인',
                            onPress: () => {
                              logout();
                              router.replace('/');
                            },
                          },
                        ]);
                      } else {
                        Alert.alert('오류', response.error || '회원 탈퇴에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('Account deletion error:', error);
                      Alert.alert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
                    } finally {
                      setIsLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
          `버전: 1.0.4\n개발자: Saul Park\n문의: saulpark12@gmail.com\n\n© 2025 Shook. All rights reserved.`,
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
          // TODO: 카카오 로그인 기능 추가 시 활성화 (카카오 계정 사용자만 로그아웃 가능)
          // {!user?.isGuest && (
          //   <TouchableOpacity onPress={handleLogout} disabled={isLoading} style={styles.logoutButton}>
          //     <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#374151" />
          //   </TouchableOpacity>
          // )}
          undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: Math.max(24, tabBarHeight * 0.7) }}>
        <View style={styles.content}>
          {user?.isGuest && (
            <View style={styles.guestBanner}>
              <Text style={styles.guestBannerTitle}>카카오 계정 연동</Text>
              <Text style={styles.guestBannerText}>
                게스트 계정을 카카오 계정으로 연동하면 다른 기기에서도 데이터를 동기화할 수 있습니다.
              </Text>
              <Pressable
                onPress={handleLinkKakaoAccount}
                disabled={isLinkingKakao}
                style={({ pressed }) => [
                  styles.convertButton,
                  isLinkingKakao && styles.convertButtonDisabled,
                  pressed && !isLinkingKakao && styles.convertButtonPressed
                ]}
              >
                {isLinkingKakao ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Image
                    source={require('@/assets/images/kakao_login_medium_wide.png')}
                    style={styles.kakaoButtonImage}
                    resizeMode="cover"
                  />
                )}
              </Pressable>
            </View>
          )}

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

            {/* Account Deletion Button (only for non-guest users) */}
            {/* TODO: 카카오 로그인 기능 추가 시 활성화 (카카오 계정 사용자만 회원탈퇴 가능) */}
            {!user?.isGuest && (
              <Pressable
                onPress={handleDeleteAccount}
                disabled={isLoading}
                style={styles.settingItem}
              >
                <Text style={styles.settingTitle}>회원 탈퇴</Text>
                <Text style={styles.settingDescription}>
                  모든 데이터가 영구적으로 삭제됩니다
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
  },
  logoutButton: {
    padding: 4,
  },
  guestBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    padding: 16,
    marginBottom: 24,
  },
  guestBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  guestBannerText: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 16,
    lineHeight: 20,
  },
  convertButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convertButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  convertButtonDisabled: {
    opacity: 0.6,
  },
  kakaoButtonImage: {
    width: '100%',
    height: 48,
  },
});
