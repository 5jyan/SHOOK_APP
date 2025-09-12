import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ModalHeader } from '@/components/AppHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useNotificationStore } from '@/stores/notification-store';
import { notificationService } from '@/services/notification';
import { notificationLogger } from '@/utils/logger-enhanced';
import { apiService } from '@/services/api';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export default function NotificationSettingsScreen() {
  const { 
    isRegistered, 
    isRegistering, 
    error, 
    isUIEnabled,
    permissionStatus,
    setUIEnabled,
    setPermissionStatus,
    updateUIState
  } = useNotificationStore();

  // Sync with backend state and check permissions on mount and when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      notificationLogger.info('Screen focused, syncing with backend and checking permissions', {
        currentIsUIEnabled: isUIEnabled,
        currentPermissionStatus: permissionStatus,
        currentIsRegistered: isRegistered
      });
      
      // First sync with backend DB state, then check local permissions
      initializeNotificationState();
    }, []) // Remove dependencies to prevent re-triggering during state changes
  );

  const initializeNotificationState = async () => {
    try {
      notificationLogger.info('Starting notification state initialization');
      
      // Step 1: Sync with backend DB state only if not recently synced
      const lastSync = useNotificationStore.getState().lastSyncTime;
      const shouldSync = !lastSync || (Date.now() - lastSync > 30000); // 30 seconds threshold
      
      if (shouldSync) {
        notificationLogger.debug('Syncing with backend state (threshold passed)');
        await notificationService.syncWithBackendState();
      } else {
        notificationLogger.debug('Skipping backend sync (recently synced)', { lastSync: new Date(lastSync).toISOString() });
      }
      
      // Step 2: Check local permissions (this may auto-update UI state)
      await checkPermissionStatus();
      
      notificationLogger.info('Notification state initialization completed', {
        finalState: {
          isRegistered: useNotificationStore.getState().isRegistered,
          isUIEnabled: useNotificationStore.getState().isUIEnabled,
          permissionStatus: useNotificationStore.getState().permissionStatus
        }
      });
    } catch (error) {
      notificationLogger.error('Failed to initialize notification state', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const checkPermissionStatus = async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      const oldPermissionStatus = permissionStatus;
      
      // Update store with new permission status (will auto-update UI state)
      setPermissionStatus(permissions.status);
      
      notificationLogger.info('Permission status checked', {
        oldStatus: oldPermissionStatus,
        newStatus: permissions.status,
        granted: permissions.granted,
        isRegistered,
        currentIsUIEnabled: isUIEnabled,
        shouldBeEnabled: permissions.status === 'granted' && isRegistered
      });
    } catch (error) {
      notificationLogger.error('Failed to check permission status', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleToggleNotifications = async (value: boolean) => {
    notificationLogger.info('User toggling notifications', { 
      newValue: value, 
      currentStatus: { isUIEnabled, isRegistered, permissionStatus } 
    });

    // Immediately update UI state for responsive feel
    const oldUIState = isUIEnabled;
    setUIEnabled(value, true); // true = manual toggle

    if (value) {
      // User wants to enable notifications
      try {
        if (permissionStatus !== 'granted') {
          // Need to request permissions first
          const permissions = await notificationService.requestPermissions();
          if (!permissions.granted) {
            // Revert UI state if permission denied
            setUIEnabled(oldUIState);
            setPermissionStatus('denied');
            
            Alert.alert(
              '알림 권한 필요',
              '새로운 영상 알림을 받으려면 알림 권한이 필요합니다. 설정에서 알림을 허용해주세요.',
              [
                { text: '취소', style: 'cancel' },
                { text: '설정으로 이동', onPress: () => Notifications.openSettingsAsync() }
              ]
            );
            return;
          }
          setPermissionStatus('granted');
        }

        // Initialize notification service first (if needed)
        await notificationService.initialize();
        
        // Force re-register with backend to ensure server has the token
        const registerSuccess = await notificationService.forceRegister();
        
        if (!registerSuccess) {
          // Revert UI state if registration failed
          setUIEnabled(oldUIState);
          notificationLogger.warn('Force registration failed, reverted UI state');
          return;
        }
        
        notificationLogger.info('Notifications enabled successfully');
      } catch (error) {
        // Revert UI state on error
        setUIEnabled(oldUIState);
        notificationLogger.error('Failed to enable notifications', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      // User wants to disable notifications
      try {
        notificationLogger.info('🔴 [DISABLE] Starting notification disable process', {
          currentState: { isUIEnabled, isRegistered, permissionStatus },
          deviceId: Constants.sessionId || 'unknown',
          timestamp: new Date().toISOString()
        });
        
        // Unregister push token from backend
        const success = await notificationService.unregisterWithBackend();
        
        notificationLogger.info('🔴 [DISABLE] Notification disable process completed', { 
          success,
          newState: useNotificationStore.getState()
        });
        
        if (!success) {
          // Revert UI state if unregister failed
          setUIEnabled(oldUIState);
          notificationLogger.warn('🔴 [DISABLE] Unregister failed, reverted UI state');
          Alert.alert('알림 해제 실패', '알림 해제에 실패했습니다. 다시 시도해주세요.');
        } else {
          notificationLogger.info('🔴 [DISABLE] Unregister successful - notifications should stop');
        }
      } catch (error) {
        // Revert UI state on error
        setUIEnabled(oldUIState);
        notificationLogger.error('🔴 [DISABLE] Failed to disable notifications', {
          error: error instanceof Error ? error.message : String(error)
        });
        Alert.alert('알림 해제 오류', `오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleOpenSystemSettings = () => {
    Alert.alert(
      '시스템 설정',
      '기기의 시스템 설정에서 알림을 관리할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: () => Notifications.openSettingsAsync() }
      ]
    );
  };

  const handleSendTestNotification = async () => {
    try {
      notificationLogger.info('Sending test push notification from server');
      const response = await apiService.sendTestPushNotification();
      
      if (response.success) {
        Alert.alert(
          '테스트 알림 전송 완료',
          `성공적으로 전송되었습니다!\n\n실제 토큰: ${response.data?.realTokenCount || 0}개\n전체 토큰: ${response.data?.tokenCount || 0}개`,
          [{ text: '확인' }]
        );
        notificationLogger.info('Test notification sent successfully', response.data);
      } else {
        Alert.alert(
          '테스트 알림 전송 실패',
          response.error || '알 수 없는 오류가 발생했습니다.',
          [{ text: '확인' }]
        );
        notificationLogger.error('Test notification failed', { error: response.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationLogger.error('Error sending test notification', { error: errorMessage });
      Alert.alert('오류', `테스트 알림 전송 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  const handleDebugPushTokens = async () => {
    try {
      notificationLogger.info('Fetching push token debug info');
      const response = await apiService.getPushTokenStatus();
      
      notificationLogger.debug('Debug: Raw API response', {
        success: response.success,
        data: response.data,
        error: response.error,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data)
      });
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const tokens = response.data;
        const deviceId = Constants.sessionId || 'unknown';
        const currentDeviceToken = tokens.find(token => token.deviceId === deviceId);
        
        const debugInfo = {
          totalTokens: tokens.length,
          currentDeviceId: deviceId,
          currentDeviceToken: currentDeviceToken ? {
            id: currentDeviceToken.id,
            deviceId: currentDeviceToken.deviceId,
            isActive: currentDeviceToken.isActive,
            platform: currentDeviceToken.platform,
            createdAt: currentDeviceToken.createdAt,
            updatedAt: currentDeviceToken.updatedAt,
            tokenPrefix: currentDeviceToken.tokenPrefix
          } : 'NOT_FOUND',
          allTokens: tokens.map(token => ({
            deviceId: token.deviceId,
            isActive: token.isActive,
            platform: token.platform,
            tokenPrefix: token.tokenPrefix
          }))
        };
        
        notificationLogger.info('Push token debug info', debugInfo);
        
        Alert.alert(
          'Push Token Debug Info',
          `Total tokens: ${tokens.length}\n` +
          `Current device: ${deviceId}\n` +
          `Current token: ${currentDeviceToken ? `Active=${currentDeviceToken.isActive}` : 'NOT_FOUND'}\n` +
          `All tokens: ${JSON.stringify(debugInfo.allTokens, null, 2)}`,
          [{ text: 'OK' }]
        );
      } else {
        const errorMsg = `API Error - Success: ${response.success}, Data type: ${typeof response.data}, Is Array: ${Array.isArray(response.data)}, Error: ${response.error}`;
        Alert.alert('Debug Error', errorMsg);
        notificationLogger.warn('Debug: Invalid API response format', {
          success: response.success,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          error: response.error,
          data: response.data
        });
      }
    } catch (error) {
      notificationLogger.error('Debug fetch failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      Alert.alert('Debug Error', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getStatusText = () => {
    if (isRegistering) return '설정 중...';
    if (error) return `오류: ${error}`;
    if (permissionStatus === 'denied') return '권한이 거부됨';
    if (permissionStatus === 'undetermined') return '권한 미설정';
    if (permissionStatus === 'granted' && isRegistered) return '알림 활성화됨';
    if (permissionStatus === 'granted' && !isRegistered) return '서버 등록 해제됨';
    return '알림 비활성화됨';
  };

  const getStatusColor = () => {
    if (isRegistering) return '#6b7280';
    if (error || permissionStatus === 'denied') return '#ef4444';
    if (permissionStatus === 'granted' && isRegistered) return '#10b981';
    if (permissionStatus === 'granted' && !isRegistered) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="알림 설정" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.mainSetting}>
            <View style={styles.mainSettingInfo}>
              <Text style={styles.mainSettingTitle}>새 영상 알림</Text>
              <Text style={styles.mainSettingDescription}>
                구독한 채널에 새로운 영상이 업로드되면 알림을 받습니다
              </Text>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
            <Switch
              value={isUIEnabled}
              onValueChange={handleToggleNotifications}
              disabled={isRegistering}
              trackColor={{ false: '#f1f5f9', true: '#10b981' }}
              thumbColor={isUIEnabled ? '#ffffff' : '#6b7280'}
              ios_backgroundColor="#f1f5f9"
            />
          </View>
        </View>

        {/* Additional Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 관리</Text>
          
          <Pressable
            onPress={handleOpenSystemSettings}
            style={styles.settingItem}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>시스템 설정</Text>
              <Text style={styles.settingDescription}>
                기기의 알림 설정에서 소리, 진동 등을 관리합니다
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={handleDebugPushTokens}
            style={[styles.settingItem, { backgroundColor: '#fef3c7' }]}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: '#d97706' }]}>🐛 Debug: Push Token 상태 확인</Text>
              <Text style={[styles.settingDescription, { color: '#92400e' }]}>
                서버의 실제 push token 등록 상태를 확인합니다
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#d97706" />
          </Pressable>

          <Pressable
            onPress={handleSendTestNotification}
            style={[styles.settingItem, { backgroundColor: '#ecfdf5' }]}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: '#047857' }]}>🔔 테스트 알림 전송</Text>
              <Text style={[styles.settingDescription, { color: '#065f46' }]}>
                서버에서 실제 푸시 알림을 전송해서 테스트합니다
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#047857" />
          </Pressable>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 정보</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>알림이 전송되는 경우</Text>
            <Text style={styles.infoText}>
              • 구독한 YouTube 채널에 새로운 영상이 업로드될 때{'\n'}
              • AI 요약이 생성 완료되었을 때{'\n'}
              • 앱이 백그라운드에 있거나 종료된 상태에서도 알림을 받습니다
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>개인정보 보호</Text>
            <Text style={styles.infoText}>
              알림 설정 정보는 안전하게 암호화되어 저장되며, 언제든지 해제할 수 있습니다. 
              자세한 내용은 개인정보처리방침을 참조하세요.
            </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  mainSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mainSettingInfo: {
    flex: 1,
    marginRight: 16,
  },
  mainSettingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  mainSettingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
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
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});