import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TabHeader } from '@/components/AppHeader';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEST_IDS } from '@/constants/test-ids';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 752);
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const tabBarHeight = useBottomTabOverflow();
  const appVersion = Constants.expoConfig?.version ?? '알 수 없음';
  const contentVersion = Constants.expoConfig?.extra?.contentVersion ?? appVersion;

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
      section: '계정',
      icon: 'account-circle-outline' as const,
      testID: TEST_IDS.settings.snsLink,
      title: 'SNS 계정 연동',
      description: 'Shook 계정을 카카오 계정과 연동합니다',
      onPress: () => {
        router.push('/sns-link');
      },
    },
    {
      section: '환경 설정',
      icon: 'bell-outline' as const,
      testID: TEST_IDS.settings.notifications,
      title: '알림 설정',
      description: '푸시 알림과 알림 주기를 설정합니다',
      descriptionLines: 1,
      onPress: () => {
        router.push('/notification-settings');
      },
    },
    {
      section: '서비스 안내',
      icon: 'shield-account-outline' as const,
      testID: TEST_IDS.settings.privacy,
      title: '개인정보처리방침',
      description: '개인정보 수집 및 이용에 관한 방침을 확인합니다',
      onPress: () => {
        router.push('/privacy-policy');
      },
    },
    {
      section: '서비스 안내',
      icon: 'file-document-outline' as const,
      testID: TEST_IDS.settings.terms,
      title: '서비스 이용약관',
      description: '서비스 이용에 관한 약관을 확인합니다',
      onPress: () => {
        router.push('/terms-of-service');
      },
    },
    {
      section: '서비스 안내',
      icon: 'information-outline' as const,
      testID: TEST_IDS.settings.appInfo,
      title: '앱 정보',
      description: '버전 정보 및 앱 개발자 정보를 확인합니다',
      onPress: () => {
        Alert.alert(
          'Shook 앱 정보',
          `앱 버전: ${appVersion}\n콘텐츠 버전: ${contentVersion}\n개발자: Saul Park\n문의: saulpark12@gmail.com\n\n© 2026 Shook. All rights reserved.`,
          [{ text: '확인' }]
        );
      },
    },
  ];

  // Developer tools item (only for manager/tester)
  const developerToolsItem = {
    icon: 'tools' as const,
    title: '개발자 도구',
    description: '개발 및 테스트를 위한 도구들입니다',
    onPress: handleDeveloperToolsPress,
  };

  return (
    <SafeAreaView
      testID={TEST_IDS.screens.settings}
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <TabHeader title="설정" />

      <ScrollView
        testID={TEST_IDS.settings.scroll}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            width: contentWidth,
            paddingBottom: Math.max(32, tabBarHeight + 16),
          },
        ]}
      >
        <View style={styles.content}>
          {['계정', '환경 설정', '서비스 안내'].map((section) => (
            <View key={section} style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>{section}</Text>
              <View style={styles.sectionCard}>
                {settingsItems.filter((item) => item.section === section).map((item, index, items) => (
                  <Pressable
                    key={item.title}
                    testID={item.testID}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}, ${item.description}`}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.settingItem,
                      index < items.length - 1 && styles.settingItemDivider,
                      pressed && styles.settingItemPressed,
                    ]}
                  >
                    <View style={styles.settingIcon}>
                      <MaterialCommunityIcons name={item.icon} size={22} color={SummaryTheme.colors.accent} />
                    </View>
                    <View style={styles.settingCopy}>
                      <Text style={styles.settingTitle} allowFontScaling={false}>{item.title}</Text>
                      <Text style={styles.settingDescription} numberOfLines={2} allowFontScaling={false}>{item.description}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={SummaryTheme.colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {hasDeveloperAccess && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>개발</Text>
              <View style={styles.sectionCard}>
                <Pressable
                  testID={TEST_IDS.settings.developerTools}
                  accessibilityRole="button"
                  accessibilityLabel="개발자 도구"
                  onPress={developerToolsItem.onPress}
                  style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed]}
                >
                  <View style={[styles.settingIcon, styles.developerIcon]}>
                    <MaterialCommunityIcons name={developerToolsItem.icon} size={22} color={SummaryTheme.colors.textSecondary} />
                  </View>
                  <View style={styles.settingCopy}>
                    <Text style={styles.settingTitle} allowFontScaling={false}>{developerToolsItem.title}</Text>
                    <Text style={styles.settingDescription} allowFontScaling={false}>{developerToolsItem.description}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={SummaryTheme.colors.textMuted} />
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>계정 관리</Text>
            <View style={styles.sectionCard}>
              <Pressable
                testID={TEST_IDS.settings.deleteAccount}
                accessibilityRole="button"
                accessibilityLabel="회원 탈퇴, 계정과 모든 데이터를 영구적으로 삭제"
                onPress={handleDeleteAccount}
                disabled={isLoading}
                style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed, isLoading && styles.disabledItem]}
              >
                <View style={styles.settingIcon}>
                  {isLoading ? <ActivityIndicator size="small" color={SummaryTheme.colors.accent} /> : <MaterialCommunityIcons name="account-remove-outline" size={22} color={SummaryTheme.colors.accent} />}
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle} allowFontScaling={false}>회원 탈퇴</Text>
                  <Text style={styles.settingDescription} allowFontScaling={false}>계정과 구독·알림 데이터를 영구적으로 삭제합니다</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={SummaryTheme.colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.versionText} allowFontScaling={false}>SHOOK {appVersion} · CONTENT {contentVersion}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SummaryTheme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { alignSelf: 'center', paddingHorizontal: 16 },
  content: { paddingTop: 4, paddingBottom: 16 },
  section: { marginTop: 24 },
  sectionTitle: {
    color: SummaryTheme.colors.textSecondary, fontSize: 13, fontWeight: '800', marginLeft: 4, marginBottom: 9,
  },
  sectionCard: {
    overflow: 'hidden', backgroundColor: SummaryTheme.colors.surface, borderWidth: 1,
    borderColor: SummaryTheme.colors.border, borderRadius: SummaryTheme.radius.card,
  },
  settingItem: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  settingItemDivider: { borderBottomWidth: 1, borderBottomColor: SummaryTheme.colors.border },
  settingItemPressed: { backgroundColor: SummaryTheme.colors.pressed },
  disabledItem: { opacity: 0.55 },
  settingIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SummaryTheme.colors.accentSoft,
  },
  settingCopy: { flex: 1, marginHorizontal: 12 },
  settingTitle: { fontSize: 16, fontWeight: '700', color: SummaryTheme.colors.textPrimary, marginBottom: 3 },
  settingDescription: { fontSize: 13, color: SummaryTheme.colors.textSecondary, lineHeight: 18 },
  developerIcon: { backgroundColor: SummaryTheme.colors.pressed },
  versionText: {
    color: SummaryTheme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
    textAlign: 'center', marginTop: 24,
  },
});
