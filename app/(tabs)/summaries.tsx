import { EmptyState } from '@/components/EmptyState';
import { SummaryCard } from '@/components/SummaryCard';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useChannels } from '@/contexts/ChannelsContext';
import { SummaryCardData, transformVideoSummaryToCardData, useVideoSummariesCached } from '@/hooks/useVideoSummariesCached';
import { useAuthStore } from '@/stores/auth-store';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uiLogger } from '@/utils/logger-enhanced';

export default function SummariesScreen() {
  uiLogger.debug('[SummariesScreen] Component mounting/re-rendering');
  
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const { channels } = useChannels(); // Get channel data from context
  const tabBarHeight = useBottomTabOverflow();
  uiLogger.debug('[SummariesScreen] User from auth store', { userId: user?.id, userEmail: user?.email });
  uiLogger.debug('[SummariesScreen] Channels from context', { channelCount: channels.length });
  
  const { 
    data: videoSummaries = [], 
    isLoading, 
    error, 
    refetch,
    cacheData,
    queryState,
    removeChannelVideos 
  } = useVideoSummariesCached();
  
  uiLogger.debug('[SummariesScreen] Hook results', {
    videoSummariesCount: videoSummaries.length,
    isLoading,
    error: error?.message || null,
    fromCache: cacheData?.fromCache,
    cacheStats: cacheData?.cacheStats,
    lastSync: cacheData?.lastSync ? new Date(cacheData.lastSync).toISOString() : null
  });
  
  // Log cache performance details
  uiLogger.debug('[SummariesScreen] Cache performance', queryState);
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Refetch when tab is focused
  React.useEffect(() => {
    if (isFocused) {
      uiLogger.info('[SummariesScreen] Tab focused - checking for new data');
      refetch();
    }
  }, [isFocused, refetch]);
  
  // Transform API data to match component interface
  const summaries: SummaryCardData[] = React.useMemo(() => {
    const filtered = videoSummaries.filter(video => video.processed && video.summary);
    uiLogger.debug('[SummariesScreen] Filtered videos', { filteredCount: filtered.length });
    
    if (filtered.length > 0) {
      uiLogger.debug('[SummariesScreen] Sample videos before sorting', {
        samples: filtered.slice(0, 3).map(v => ({
          title: v.title.substring(0, 30) + '...',
          publishedAt: v.publishedAt,
          createdAt: v.createdAt
        }))
      });
    }
    
    const transformed = filtered.map(video => transformVideoSummaryToCardData(video, channels));
    // Sort by createdAt (when video was processed) which is more reliable for showing latest content
    const sorted = transformed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (sorted.length > 0) {
      uiLogger.debug('[SummariesScreen] Sample videos after sorting', {
        samples: sorted.slice(0, 3).map(v => ({
          title: v.videoTitle.substring(0, 30) + '...',
          publishedAt: v.publishedAt,
          publishedDate: new Date(v.publishedAt).toISOString()
        }))
      });
    }
    
    return sorted;
  }, [videoSummaries, channels]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      uiLogger.info('Refreshing summaries');
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCardPress = (summary: SummaryCardData) => {
    uiLogger.info('Opening summary', { videoTitle: summary.videoTitle, videoId: summary.videoId });
    router.push({
      pathname: '/summary-detail',
      params: { 
        summaryId: summary.id,
        videoTitle: summary.videoTitle 
      }
    });
  };

  const renderSummaryCard = ({ item }: { item: SummaryCardData }) => (
    <SummaryCard
      key={item.id}
      summary={item}
      onPress={() => handleCardPress(item)}
    />
  );

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285f4" />
          <Text style={styles.loadingText}>요약을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="요약을 불러올 수 없습니다"
          description={`오류: ${error.message}`}
          icon="exclamationmark.triangle"
          action={
            <View style={styles.retryButton}>
              <Text style={styles.retryButtonText} onPress={() => refetch()}>
                다시 시도
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  if (summaries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="요약된 콘텐츠가 없습니다"
          description="구독한 채널의 새 영상이 업로드되면 AI가 자동으로 요약해서 여기에 표시됩니다."
          icon="doc.text"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>요약 리스트</Text>
      </View>
      
      <FlatList
        data={summaries}
        renderItem={renderSummaryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(16, tabBarHeight * 0.7) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  listContainer: {
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  retryButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});