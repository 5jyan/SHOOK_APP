import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SummaryCard } from '@/components/SummaryCard';
import { EmptyState } from '@/components/EmptyState';
import { useVideoSummariesCached, transformVideoSummaryToCardData, SummaryCardData } from '@/hooks/useVideoSummariesCached';
import { useAuthStore } from '@/stores/auth-store';

export default function SummariesScreen() {
  console.log('📺 [SummariesScreen] Component mounting/re-rendering');
  
  const { user } = useAuthStore();
  console.log('📺 [SummariesScreen] User from auth store:', user);
  
  const { 
    data: videoSummaries = [], 
    isLoading, 
    error, 
    refetch,
    cacheData,
    queryState 
  } = useVideoSummariesCached();
  
  console.log('📺 [SummariesScreen] Hook results:', {
    videoSummariesCount: videoSummaries.length,
    isLoading,
    error: error?.message || null,
    fromCache: cacheData?.fromCache,
    cacheStats: cacheData?.cacheStats,
    lastSync: cacheData?.lastSync ? new Date(cacheData.lastSync).toISOString() : null
  });
  
  // Log cache performance details
  console.log('📦 [SummariesScreen] Cache performance:', queryState);
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Add explicit effect to test API call
  React.useEffect(() => {
    console.log('📺 [SummariesScreen] useEffect triggered - component mounted');
    console.log('📺 [SummariesScreen] Will call refetch to test API...');
    
    // Test API call when component mounts
    const testApiCall = async () => {
      try {
        console.log('📺 [SummariesScreen] Calling refetch() manually...');
        await refetch();
        console.log('📺 [SummariesScreen] Manual refetch completed');
      } catch (error) {
        console.error('📺 [SummariesScreen] Manual refetch failed:', error);
      }
    };
    
    testApiCall();
  }, []); // Empty dependency array - only run on mount
  
  // Transform API data to match component interface
  const summaries: SummaryCardData[] = React.useMemo(() => {
    return videoSummaries
      .filter(video => video.processed && video.summary) // Only show processed videos with summaries
      .map(video => transformVideoSummaryToCardData(video))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()); // Sort by publish date
  }, [videoSummaries]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing summaries...');
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCardPress = (summary: SummaryCardData) => {
    console.log('📖 Opening summary:', summary.videoTitle);
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
      <FlatList
        data={summaries}
        renderItem={renderSummaryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
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
    backgroundColor: '#f9fafb',
  },
  listContainer: {
    padding: 16,
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