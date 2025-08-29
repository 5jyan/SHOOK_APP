import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';

export function ManualMonitoringButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const triggerMonitoring = async () => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      setIsLoading(true);
      serviceLogger.info('Triggering manual YouTube monitoring', {
        component: 'ManualMonitoringButton',
        userId: user.id
      });
      
      // Call the manual monitoring endpoint
      const response = await apiService.triggerManualMonitoring();

      serviceLogger.info('Manual monitoring response received', {
        component: 'ManualMonitoringButton',
        userId: user.id,
        success: response.success,
        responseKeys: Object.keys(response)
      });
      
      if (response.success) {
        Alert.alert(
          '성공', 
          '수동 모니터링이 완료되었습니다!\n\n새로운 영상이 발견되면 푸시 알림으로 알려드립니다.',
          [{ text: '확인', style: 'default' }]
        );
      } else {
        throw new Error(response.error || '알 수 없는 오류가 발생했습니다');
      }
    } catch (error) {
      serviceLogger.error('Error triggering manual monitoring', {
        component: 'ManualMonitoringButton',
        userId: user?.id,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      Alert.alert(
        '오류', 
        `수동 모니터링 실행 중 오류가 발생했습니다:\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        [{ text: '확인', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    Alert.alert(
      '수동 모니터링 실행',
      '등록된 모든 YouTube 채널을 즉시 확인하여 새로운 영상이 있는지 검사합니다.\n\n실행하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '실행', 
          style: 'default',
          onPress: triggerMonitoring 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={isLoading}
        style={[styles.button, isLoading && styles.disabledButton]}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.icon} />
          ) : (
            <Text style={styles.icon}>▶️</Text>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {isLoading ? '모니터링 실행 중...' : '수동 모니터링 실행'}
            </Text>
            <Text style={styles.description}>
              {isLoading 
                ? 'YouTube 채널을 확인하고 있습니다...' 
                : '등록된 채널에서 새로운 영상을 즉시 확인합니다'
              }
            </Text>
          </View>
        </View>
      </Pressable>
      
      {/* Warning Notice */}
      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ 주의사항</Text>
        <Text style={styles.warningText}>
          • 이 기능은 개발 및 디버그 목적으로 제공됩니다{'\n'}
          • 자동 모니터링이 5분마다 실행되므로 일반적으로 수동 실행이 불필요합니다{'\n'}
          • YouTube API 호출 한도를 소모하므로 필요한 경우에만 사용하세요
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#e0e7ff',
    fontSize: 14,
    lineHeight: 20,
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
});