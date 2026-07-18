import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal } from 'react-native';
import { videoCacheService } from '@/services/video-cache';
import { uiLogger } from '@/utils/logger-enhanced';
import { SummaryTheme } from '@/constants/SummaryTheme';

export function CacheStatsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const handleShowStats = async () => {
    setIsLoading(true);
    
    try {
      // Demonstrate new performance measurement feature
      const stats = await uiLogger.timeAsync('cache-stats-retrieval', async () => {
        uiLogger.info('Getting cache statistics');
        return await videoCacheService.getCacheStats();
      });
      
      setCacheStats(stats);
      setStatsModalVisible(true);
      
      uiLogger.info('Cache stats retrieved', { totalEntries: stats.totalEntries, cacheSize: stats.cacheSize });
    } catch (error) {
      uiLogger.error('Error getting cache stats', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert(
        '오류',
        '캐시 정보를 가져올 수 없습니다.',
        [{ text: '확인', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      '캐시 삭제',
      '모든 캐시된 비디오 요약 데이터를 삭제하시겠습니까? 다음 요약 로딩 시 모든 데이터를 다시 받아와야 합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              uiLogger.info('Clearing cache');
              await videoCacheService.clearCache();
              
              // Update stats after clearing
              const newStats = await videoCacheService.getCacheStats();
              setCacheStats(newStats);
              
              Alert.alert('완료', '캐시가 삭제되었습니다.');
              uiLogger.info('Cache cleared successfully');
            } catch (error) {
              uiLogger.error('Error clearing cache', { error: error instanceof Error ? error.message : String(error) });
              Alert.alert('오류', '캐시 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatSize = (sizeKB: number): string => {
    if (sizeKB < 1) return '< 1KB';
    if (sizeKB < 1024) return `${sizeKB.toFixed(1)}KB`;
    return `${(sizeKB / 1024).toFixed(1)}MB`;
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return '없음';
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  const formatAge = (timestamp: number): string => {
    if (timestamp === 0) return '없음';
    const ageMs = Date.now() - timestamp;
    const ageHours = Math.round(ageMs / (1000 * 60 * 60));
    const ageDays = Math.round(ageHours / 24);
    
    if (ageHours < 1) return '방금 전';
    if (ageHours < 24) return `${ageHours}시간 전`;
    return `${ageDays}일 전`;
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>캐시 정보</Text>
        <Text style={styles.description}>
          비디오 요약 캐시 상태를 확인하고 관리합니다.
        </Text>
        
        <Pressable
          onPress={handleShowStats}
          disabled={isLoading}
          style={[styles.button, isLoading && styles.disabledButton]}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '로딩 중...' : '📊 캐시 정보 보기'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={statsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>캐시 통계</Text>
            <Pressable
              onPress={() => setStatsModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            {cacheStats && (
              <>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>캐시된 비디오</Text>
                  <Text style={styles.statValue}>{cacheStats.totalEntries}개</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>캐시 크기</Text>
                  <Text style={styles.statValue}>{formatSize(cacheStats.cacheSize)}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>마지막 동기화</Text>
                  <Text style={styles.statValue}>{formatDate(cacheStats.lastSync)}</Text>
                  <Text style={styles.statSubValue}>{formatAge(cacheStats.lastSync)}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>가장 오래된 항목</Text>
                  <Text style={styles.statValue}>{formatDate(cacheStats.oldestEntry)}</Text>
                  <Text style={styles.statSubValue}>{formatAge(cacheStats.oldestEntry)}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>가장 최신 항목</Text>
                  <Text style={styles.statValue}>{formatDate(cacheStats.newestEntry)}</Text>
                  <Text style={styles.statSubValue}>{formatAge(cacheStats.newestEntry)}</Text>
                </View>

                <Pressable
                  onPress={handleClearCache}
                  style={[styles.button, styles.dangerButton]}
                >
                  <Text style={[styles.buttonText, styles.dangerButtonText]}>
                    🗑️ 캐시 삭제
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  dangerButton: {
    backgroundColor: '#ef4444',
    marginTop: 16,
  },
  dangerButtonText: {
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: SummaryTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: SummaryTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: SummaryTheme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: SummaryTheme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    padding: 16,
  },
  statCard: {
    backgroundColor: SummaryTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
  },
  statSubValue: {
    fontSize: 12,
    color: SummaryTheme.colors.textMuted,
    marginTop: 2,
  },
});
