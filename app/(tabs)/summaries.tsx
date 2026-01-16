import { TabHeader } from '@/components/AppHeader';
import { ChannelFilterBar } from '@/components/ChannelFilterBar';
import { EmptyState } from '@/components/EmptyState';
import { SummaryCard } from '@/components/SummaryCard';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useChannels } from '@/contexts/ChannelsContext';
import { SummaryCardData, transformVideoSummaryToCardData, useVideoSummariesCached } from '@/hooks/useVideoSummariesCached';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import { useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SummariesScreen() {
  uiLogger.debug('[SummariesScreen] Component mounting/re-rendering');

  const isFocused = useIsFocused();
  const params = useLocalSearchParams();
  const fromNotification = params.fromNotification === 'true';
  const { user } = useAuthStore();
  const [skipInitialFetch] = React.useState(fromNotification);
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
    cachePrimed,
    queryState,
    removeChannelVideos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useVideoSummariesCached({
    refetchOnMount: !fromNotification,
    skipInitialFetch
  });

  React.useEffect(() => {
    if (fromNotification) {
      router.setParams({ fromNotification: undefined });
    }
  }, [fromNotification, router]);
  
  uiLogger.debug('[SummariesScreen] Hook results', {
    videoSummariesCount: videoSummaries.length,
    isLoading,
    error: error?.message || null,
    cachePrimed,
    fromCache: cacheData?.fromCache,
    cacheStats: cacheData?.cacheStats,
    lastSync: cacheData?.lastSync ? new Date(cacheData.lastSync).toISOString() : null
  });
  
  // Log cache performance details
  uiLogger.debug('[SummariesScreen] Cache performance', queryState);

  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(null);

  // Set selected channel from navigation params
  React.useEffect(() => {
    if (params.channelId && typeof params.channelId === 'string') {
      uiLogger.info('[SummariesScreen] Setting selected channel from params', {
        channelId: params.channelId,
        timestamp: params._t
      });
      setSelectedChannelId(params.channelId);
    }
  }, [params.channelId, params._t]);
  
  // Transform API data to match component interface
  const summaries: SummaryCardData[] = React.useMemo(() => {
    let filtered = videoSummaries.filter((video) => {
      const isSummarized = video.isSummarized ?? !!video.summary;
      if (isSummarized) {
        return !!video.summary;
      }
      return video.processingStatus !== 'failed';
    });

    // Filter by selected channel if one is selected
    if (selectedChannelId) {
      filtered = filtered.filter(video => video.channelId === selectedChannelId);
      uiLogger.debug('[SummariesScreen] Filtered by channel', {
        selectedChannelId,
        filteredCount: filtered.length
      });
    }

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
    // Sort by publishedAt (when video was uploaded to YouTube) to match the displayed date
    const sorted = transformed.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

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
  }, [videoSummaries, channels, selectedChannelId]);

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
    if (!summary.isSummarized) {
      Alert.alert('요약 진행 중', '해당 영상은 요약이 진행중입니다');
      return;
    }

    uiLogger.info('Opening summary', { videoTitle: summary.videoTitle, videoId: summary.videoId });
    router.push({
      pathname: '/summary-detail',
      params: { 
        summaryId: summary.id,
        videoTitle: summary.videoTitle 
      }
    });
  };

  const handleEndReached = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderListFooter = () => {
    if (!hasNextPage) {
      return null;
    }
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#4285f4" />
        </View>
      );
    }
    return null;
  };

  const renderSummaryCard = ({ item }: { item: SummaryCardData }) => (
    <SummaryCard
      key={item.id}
      summary={item}
      onPress={() => handleCardPress(item)}
    />
  );

  const hasCachedSummaries = (cacheData?.videos?.length ?? 0) > 0;

  // Show loading state only when there's no cached data to render
  if (isLoading && videoSummaries.length === 0 && !hasCachedSummaries) {
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

  // 전체 영상이 없는 경우 (채널 구독 전)
  const hasNoVideosAtAll = videoSummaries.filter((video) => {
    const isSummarized = video.isSummarized ?? !!video.summary;
    return isSummarized ? !!video.summary : true;
  }).length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <TabHeader title="요약 리스트" />

      <ChannelFilterBar
        selectedChannelId={selectedChannelId}
        onChannelSelect={setSelectedChannelId}
      />

      {summaries.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <EmptyState
            title={hasNoVideosAtAll ? "요약된 콘텐츠가 없습니다" : "이 채널의 요약이 없습니다"}
            description={
              hasNoVideosAtAll
                ? "구독한 채널의 새 영상이 업로드되면 자동으로 요약해서 여기에 표시됩니다."
                : "선택한 채널에 아직 요약된 영상이 없습니다."
            }
            icon="doc.text"
          />
        </View>
      ) : (
        <FlatList
          data={summaries}
          renderItem={renderSummaryCard}
          keyExtractor={(item) => item.id}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(16, tabBarHeight * 0.7), flexGrow: 1 }
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderListFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContainer: {
    paddingTop: 0,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
