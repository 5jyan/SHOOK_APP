import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { cacheLogger } from '@/utils/logger-enhanced';
import { useQueryClient } from '@tanstack/react-query';
import { SummaryTheme } from '@/constants/SummaryTheme';

export function ForceCacheResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleResetCache = async () => {
    Alert.alert(
      '⚠️ 캐시 강제 초기화',
      '모든 캐시 데이터를 삭제하고 다음 번 동기화 시 전체 데이터를 다시 받아옵니다.\n\n계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              cacheLogger.info('🔥 Force cache reset initiated');

              // 1. Clear all video cache keys
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter(key =>
                key.startsWith('video_') ||
                key.startsWith('channel_') ||
                key.startsWith('@cache:')
              );

              cacheLogger.info('Found cache keys to delete', { keyCount: cacheKeys.length, keys: cacheKeys });

              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }

              // 2. Use enhanced cache service's clear method
              await videoCacheService.clearCache();

              // 3. Invalidate all TanStack Query caches
              await queryClient.invalidateQueries();
              await queryClient.refetchQueries();

              cacheLogger.info('✅ Cache reset completed successfully');

              Alert.alert(
                '완료',
                '캐시가 초기화되었습니다.\n\n다음 번 동기화 시 전체 데이터를 새로 받아옵니다.',
                [{ text: '확인' }]
              );
            } catch (error) {
              cacheLogger.error('Failed to reset cache', {
                error: error instanceof Error ? error.message : String(error)
              });
              Alert.alert(
                '오류',
                '캐시 초기화에 실패했습니다.\n\n' + (error instanceof Error ? error.message : String(error)),
                [{ text: '확인' }]
              );
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Pressable
      onPress={handleResetCache}
      disabled={isResetting}
      style={[styles.button, isResetting && styles.disabledButton]}
    >
      <View style={styles.content}>
        {isResetting ? (
          <ActivityIndicator size="small" color={SummaryTheme.colors.textPrimary} />
        ) : (
          <>
            <Text style={styles.emoji}>🔥</Text>
            <View style={styles.textContainer}>
              <Text style={styles.title}>캐시 강제 초기화</Text>
              <Text style={styles.description}>
                타임스탬프 오류 해결 - 모든 캐시 삭제
              </Text>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: SummaryTheme.colors.pressed,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
  },
});
