import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useNotificationStore } from '@/stores/notification-store';
import { apiService } from '@/services/api';
import { notificationLogger } from '@/utils/logger-enhanced';
import { SummaryTheme } from '@/constants/SummaryTheme';

export function PushNotificationTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { isRegistering, isRegistered, error } = useNotificationStore();

  const handleTestPushNotification = async () => {
    setIsLoading(true);
    
    try {
      notificationLogger.info('Sending test push notification', {
        component: 'PushNotificationTestButton',
        action: 'test_notification_start'
      });
      
      const response = await apiService.sendTestPushNotification();
      
      if (response.success) {
        notificationLogger.info('Test notification sent successfully', {
          component: 'PushNotificationTestButton',
          action: 'test_notification_success',
          response: response
        });
        Alert.alert(
          '성공',
          '테스트 푸시 알림이 발송되었습니다! 잠시 후 알림을 확인해보세요.',
          [{ text: '확인', style: 'default' }]
        );
      } else {
        notificationLogger.error('Test notification failed', {
          component: 'PushNotificationTestButton',
          action: 'test_notification_failure',
          error: response.error,
          response: response
        });
        Alert.alert(
          '실패',
          response.error || '푸시 알림 발송에 실패했습니다.',
          [{ text: '확인', style: 'default' }]
        );
      }
    } catch (error) {
      notificationLogger.error('Error sending test notification', {
        component: 'PushNotificationTestButton',
        action: 'test_notification_error',
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error
      });
      Alert.alert(
        '오류',
        '푸시 알림 테스트 중 오류가 발생했습니다.',
        [{ text: '확인', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonState = () => {
    if (isRegistering) {
      return { disabled: true, text: '알림 등록 중...' };
    }
    if (!isRegistered) {
      return { disabled: true, text: '알림 등록 실패' };
    }
    if (isLoading) {
      return { disabled: true, text: '발송 중...' };
    }
    return { disabled: false, text: '🔔 테스트 알림 보내기' };
  };

  const buttonState = getButtonState();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>푸시 알림 테스트</Text>
      <Text style={styles.description}>
        테스트 푸시 알림을 발송하여 알림 시스템이 정상적으로 작동하는지 확인합니다.
        {error && <Text style={styles.errorText}>오류: {error}</Text>}
      </Text>
      
      <Pressable
        onPress={handleTestPushNotification}
        disabled={buttonState.disabled}
        style={[styles.button, buttonState.disabled && styles.disabledButton]}
      >
        <Text style={styles.buttonText}>{buttonState.text}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SummaryTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: SummaryTheme.colors.pressed,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: SummaryTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});
