import { ModalHeader } from '@/components/AppHeader';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { notificationService } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification-store';
import { notificationLogger } from '@/utils/logger-enhanced';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const { isRegistered, permissionStatus, setPermissionStatus } = useNotificationStore();
  const [isEnabled, setIsEnabled] = useState(isRegistered);
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissionStatus = React.useCallback(async () => {
    try {
      const didSync = await notificationService.syncWithBackendState();
      const permissions = await Notifications.getPermissionsAsync();
      const isAllowed = notificationService.areNotificationsAllowed(permissions);
      setPermissionStatus(isAllowed ? 'granted' : permissions.status);

      if (didSync) {
        setIsEnabled(
          isAllowed &&
          useNotificationStore.getState().isRegistered &&
          await notificationService.isNotificationsEnabled()
        );
      }
    } catch (error) {
      notificationLogger.error('Failed to check permission status', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [setPermissionStatus]);

  useFocusEffect(
    React.useCallback(() => {
      void checkPermissionStatus();
    }, [checkPermissionStatus])
  );

  // Safe function to open system settings
  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
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
        await notificationService.setNotificationsEnabled(true);
        let permissions = await Notifications.getPermissionsAsync();

        if (!notificationService.areNotificationsAllowed(permissions)) {
          permissions = await notificationService.requestPermissions();
        }

        if (!notificationService.areNotificationsAllowed(permissions)) {
          // 권한 거부 시 원복
          setIsEnabled(false);
          await notificationService.setNotificationsEnabled(false);
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

        const success = await notificationService.forceRegister();

        if (success) {
          setPermissionStatus('granted');
        } else {
          // 실패 시 원복
          await notificationService.setNotificationsEnabled(previousValue);
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
      await notificationService.setNotificationsEnabled(previousValue).catch(() => undefined);
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
            <View style={styles.toggleControl}>
              <Switch
                value={isEnabled}
                onValueChange={handleToggleNotifications}
                disabled={isLoading}
                accessibilityLabel="새 영상 알림"
                accessibilityState={{ checked: isEnabled, disabled: isLoading }}
                trackColor={{ false: SummaryTheme.colors.pressed, true: SummaryTheme.colors.accent }}
                thumbColor={isEnabled ? SummaryTheme.colors.onAccent : SummaryTheme.colors.textMuted}
                ios_backgroundColor={SummaryTheme.colors.pressed}
              />
              <Text style={[styles.toggleStatus, isEnabled && styles.toggleStatusEnabled]}>
                {isEnabled ? '켜짐' : '꺼짐'}
              </Text>
            </View>
          </View>
        </View>

        {/* Permission status info */}
        {permissionStatus !== 'granted' && (
          <View style={styles.warningSection}>
            <View style={styles.warningContent}>
              <IconSymbol name="exclamationmark.triangle" size={20} color={SummaryTheme.colors.textPrimary} />
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
              <IconSymbol name="chevron.right" size={16} color={SummaryTheme.colors.textSecondary} />
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
            <IconSymbol name="chevron.right" size={20} color={SummaryTheme.colors.textMuted} />
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
    backgroundColor: SummaryTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: SummaryTheme.colors.surface,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SummaryTheme.colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleControl: {
    alignItems: 'center',
    gap: 4,
  },
  toggleStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: SummaryTheme.colors.textMuted,
  },
  toggleStatusEnabled: {
    color: SummaryTheme.colors.textPrimary,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    lineHeight: 20,
  },
  warningSection: {
    backgroundColor: SummaryTheme.colors.accentSoft,
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
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    lineHeight: 20,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SummaryTheme.colors.pressed,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: SummaryTheme.colors.textPrimary,
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
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    lineHeight: 22,
  },
});
