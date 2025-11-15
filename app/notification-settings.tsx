import { ModalHeader } from '@/components/AppHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { notificationService } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification-store';
import { notificationLogger } from '@/utils/logger-enhanced';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const { isRegistered, permissionStatus, setPermissionStatus } = useNotificationStore();
  const [isEnabled, setIsEnabled] = useState(isRegistered);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      checkPermissionStatus();
    }, [])
  );

  const checkPermissionStatus = async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      setPermissionStatus(permissions.status);
      setIsEnabled(permissions.status === 'granted' && isRegistered);
    } catch (error) {
      notificationLogger.error('Failed to check permission status', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Safe function to open system settings
  const openSystemSettings = async () => {
    try {
      // Android: Use Linking.openSettings() directly
      if (Platform.OS === 'android') {
        await Linking.openSettings();
        return;
      }

      // iOS: Try Expo functions first, then fallback to Linking
      if (Platform.OS === 'ios') {
        // Try modern expo-notifications API (if available)
        if (typeof Notifications.openNotificationSettingsAsync === 'function') {
          try {
            await Notifications.openNotificationSettingsAsync();
            return;
          } catch (iosError) {
            notificationLogger.warn('openNotificationSettingsAsync failed, trying fallback');
          }
        }

        // Fallback to app-settings URL scheme
        await Linking.openURL('app-settings:');
      }
    } catch (error) {
      notificationLogger.error('Failed to open system settings', {
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert(
        '설정 열기 실패',
        '설정 > 알림 > Shook에서 알림을 허용해주세요.'
      );
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (isLoading) return;

    // Optimistic UI: 즉시 상태 변경
    const previousValue = isEnabled;
    setIsEnabled(value);
    setIsLoading(true);

    try {
      if (value) {
        // Enable notifications
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          // 권한 거부 시 원복
          setIsEnabled(false);
          Alert.alert(
            '알림 권한 필요',
            '새로운 영상 알림을 받으려면 알림 권한이 필요합니다.',
            [
              { text: '취소', style: 'cancel' },
              { text: '설정으로 이동', onPress: openSystemSettings }
            ]
          );
          return;
        }

        await notificationService.initialize();
        const success = await notificationService.forceRegister();

        if (success) {
          setPermissionStatus('granted');
        } else {
          // 실패 시 원복
          setIsEnabled(previousValue);
          Alert.alert('오류', '알림 설정에 실패했습니다.');
        }
      } else {
        // Disable notifications
        const success = await notificationService.unregisterWithBackend();
        if (!success) {
          // 실패 시 원복
          setIsEnabled(previousValue);
          Alert.alert('오류', '알림 해제에 실패했습니다.');
        }
      }
    } catch (error) {
      // 에러 시 원복
      setIsEnabled(previousValue);
      notificationLogger.error('Toggle notifications error', {
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert('오류', '알림 설정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="알림" />
      
      <ScrollView style={styles.scrollView}>
        {/* Main notification toggle */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>새 영상 알림</Text>
              <Text style={styles.settingDescription}>
                구독한 채널의 새 영상을 알려드려요
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggleNotifications}
              disabled={isLoading}
              trackColor={{ false: '#e5e5e5', true: '#4285f4' }}
              thumbColor={isEnabled ? '#ffffff' : '#ffffff'}
            />
          </View>
        </View>

        {/* Permission status info */}
        {permissionStatus !== 'granted' && (
          <View style={styles.warningSection}>
            <View style={styles.warningContent}>
              <IconSymbol name="exclamationmark.triangle" size={20} color="#f59e0b" />
              <View style={styles.warningText}>
                <Text style={styles.warningTitle}>알림 권한이 필요해요</Text>
                <Text style={styles.warningDescription}>
                  새 영상 알림을 받으려면 알림을 허용해주세요
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openSystemSettings}
            >
              <Text style={styles.settingsButtonText}>설정으로 이동</Text>
              <IconSymbol name="chevron.right" size={16} color="#666666" />
            </TouchableOpacity>
          </View>
        )}

        {/* System settings shortcut */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={openSystemSettings}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>시스템 알림 설정</Text>
              <Text style={styles.settingDescription}>
                기기 설정에서 자세한 알림 옵션을 변경할 수 있어요
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Info section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>알림 정보</Text>
          <Text style={styles.infoText}>
            • 새 영상이 업로드되면 AI 요약과 함께 알림을 보내드려요{'\n'}
            • 알림을 탭하면 바로 요약을 확인할 수 있어요{'\n'}
            • 언제든지 설정에서 알림을 끄거나 켤 수 있어요
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  warningSection: {
    backgroundColor: '#fef3c7',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 14,
    color: '#a16207',
    lineHeight: 20,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#d97706',
    marginRight: 8,
  },
  infoSection: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});