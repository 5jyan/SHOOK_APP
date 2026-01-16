import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChannels } from '@/contexts/ChannelsContext';
import { apiService, type PopularChannel, type UserChannel } from '@/services/api';
import { popularChannelsCacheService } from '@/services/popular-channels-cache';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import { formatChannelStats } from '@/utils/number-format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ChannelListProps {
  onChannelDeleted?: (channelId: string) => void;
  refreshControl?: React.ReactElement;
  tabBarHeight?: number;
}

export function ChannelList({ onChannelDeleted, refreshControl, tabBarHeight = 0 }: ChannelListProps) {
  const { channels, isLoading, error, deleteChannel, refreshChannels, channelCount } = useChannels();
  const { user } = useAuthStore();
  const [deletingChannelId, setDeletingChannelId] = React.useState<string | null>(null);
  const [addingChannelId, setAddingChannelId] = React.useState<string | null>(null);
  const [cachedPopularChannels, setCachedPopularChannels] = React.useState<PopularChannel[]>([]);
  const queryClient = useQueryClient();
  const maxChannels = 7;
  const isChannelLimitReached = user?.role !== 'manager' && channelCount >= maxChannels;

  const popularChannelsQuery = useQuery({
    queryKey: ['popularChannels'],
    queryFn: async (): Promise<PopularChannel[]> => {
      const response = await apiService.getPopularChannels();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load popular channels');
      }
      return response.data || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!user,
  });

  React.useEffect(() => {
    let isActive = true;
    popularChannelsCacheService.getCachedPopularChannels().then((cached) => {
      if (isActive) {
        setCachedPopularChannels(cached);
      }
    });
    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (popularChannelsQuery.data) {
      popularChannelsCacheService.savePopularChannels(popularChannelsQuery.data);
    }
  }, [popularChannelsQuery.data]);

  const popularChannels = popularChannelsQuery.data ?? cachedPopularChannels;
  const showPopularSection = popularChannels.length >= 3;
  const subscribedChannelIds = React.useMemo(
    () => new Set(channels.map((channel) => channel.youtubeChannel.channelId)),
    [channels]
  );

  uiLogger.debug('ChannelList rendering', {
    channelCount,
    channelsLength: channels.length,
    isLoading,
    error: !!error,
    channelsPreview: channels.slice(0, 2).map(ch => ({ 
      id: ch?.id, 
      title: ch?.youtubeChannel?.title,
      channelId: ch?.youtubeChannel?.channelId 
    }))
  });

  const handleUnsubscribeChannel = (channel: UserChannel) => {
    Alert.alert(
      '구독 취소',
      `"${channel.youtubeChannel.title}" 채널 구독을 취소하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '구독 취소',
          style: 'destructive',
          onPress: async () => {
            setDeletingChannelId(channel.youtubeChannel.channelId);
            try {
              await deleteChannel(channel.youtubeChannel.channelId);
              onChannelDeleted?.(channel.youtubeChannel.channelId);
              
              // Invalidate video summaries cache to refresh UI
              uiLogger.info('Invalidating video summaries cache after channel deletion');
              queryClient.invalidateQueries({ queryKey: ['videoSummariesCached'] });
              
              Alert.alert('구독 취소 완료', `"${channel.youtubeChannel.title}" 채널 구독이 취소되었습니다.`);
            } catch (err) {
              Alert.alert(
                '구독 취소 실패',
                err instanceof Error ? err.message : '채널 구독 취소 중 오류가 발생했습니다.'
              );
            } finally {
              setDeletingChannelId(null);
            }
          },
        },
      ]
    );
  };


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleChannelPress = (channel: UserChannel) => {
    uiLogger.info('Channel card pressed, navigating to summaries tab', {
      channelId: channel.youtubeChannel.channelId,
      channelTitle: channel.youtubeChannel.title
    });

    // Navigate to summaries tab with channelId parameter and timestamp to force re-render
    router.push({
      pathname: '/(tabs)/summaries',
      params: {
        channelId: channel.youtubeChannel.channelId,
        _t: Date.now().toString() // Force navigation even if already on summaries tab
      }
    });
  };

  const performAddPopularChannel = async (channel: PopularChannel) => {
    if (addingChannelId) {
      return;
    }

    const channelTitle = channel.title || '해당';

    setAddingChannelId(channel.channelId);
    try {
      uiLogger.info('Adding popular channel', {
        channelId: channel.channelId,
        channelTitle: channel.title,
      });
      const response = await apiService.addChannel(channel.channelId);

      if (response.success) {
        const latestVideos = response.data?.latestVideos?.length
          ? response.data.latestVideos
          : response.data?.latestVideo
            ? [response.data.latestVideo]
            : [];

        if (latestVideos.length > 0) {
          await videoCacheService.mergeVideos(latestVideos);
          queryClient.invalidateQueries({ queryKey: ['videoSummariesCached', user?.id] });
        }

        Alert.alert('추가 완료', `${channelTitle} 채널을 추가했어요.`);
        await refreshChannels();
      } else {
        Alert.alert('오류', response.error || '채널 추가에 실패했습니다.');
      }
    } catch (error) {
      uiLogger.error('Error adding popular channel', {
        error: error instanceof Error ? error.message : String(error),
        channelId: channel.channelId,
      });
      Alert.alert('오류', '채널 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingChannelId(null);
    }
  };

  const handleAddPopularChannel = (channel: PopularChannel) => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    if (subscribedChannelIds.has(channel.channelId)) {
      Alert.alert('이미 추가됨', '이미 구독 중인 채널입니다.');
      return;
    }

    if (isChannelLimitReached) {
      Alert.alert('채널 한도 초과', `최대 ${maxChannels}개의 채널만 구독할 수 있습니다.`);
      return;
    }

    const channelTitle = channel.title || '해당';

    Alert.alert('채널 추가', `${channelTitle} 채널을 추가할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '추가', onPress: () => performAddPopularChannel(channel) },
    ]);
  };

  const renderChannelItem = ({ item }: { item: UserChannel }) => {
    // Safety check for item and required properties
    if (!item || !item.youtubeChannel) {
      uiLogger.warn('Invalid channel item', { item });
      return null;
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.channelItem,
          pressed && styles.channelItemPressed
        ]}
        onPress={() => handleChannelPress(item)}
        android_ripple={{ color: '#e5e7eb', borderless: false }}
      >
        {/* 우측 상단 하트 버튼 */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={(e) => {
            // Prevent parent Pressable from firing
            e.stopPropagation();
            handleUnsubscribeChannel(item);
          }}
          disabled={deletingChannelId === item.youtubeChannel.channelId}
          activeOpacity={0.6}
        >
          <IconSymbol name="heart.fill" size={20} color="#ef4444" />
        </TouchableOpacity>

        <View style={styles.channelContent}>
          {item.youtubeChannel.thumbnail ? (
            <Image
              source={{ uri: item.youtubeChannel.thumbnail }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.channelThumbnail, styles.placeholderThumbnail]}>
              <Text style={styles.placeholderText}>YT</Text>
            </View>
          )}

          <View style={styles.channelInfo}>
            <Text style={styles.channelTitle} numberOfLines={2}>
              {item.youtubeChannel.title || '제목 없음'}
            </Text>
            <View style={styles.channelStats}>
                {item.youtubeChannel.subscriberCount && (
                  <Text style={styles.subscriberCount}>
                    구독자 {formatChannelStats(item.youtubeChannel.subscriberCount || 0, item.youtubeChannel.videoCount || 0).subscribers}
                  </Text>
                )}
                {item.youtubeChannel.videoCount && (
                  <Text style={styles.videoCount}>
                    동영상 {formatChannelStats(item.youtubeChannel.subscriberCount || 0, item.youtubeChannel.videoCount || 0).videos}개
                  </Text>
                )}
              </View>
            <Text style={styles.addedDate}>
              {item.createdAt ? formatDate(item.createdAt) : '날짜 없음'}에 추가됨
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderPopularSection = (options: { fullBleed?: boolean } = {}) => {
    if (!showPopularSection) {
      return null;
    }
    const { fullBleed = true } = options;

    return (
      <View style={[styles.popularSection, fullBleed && styles.popularSectionFullBleed]}>
        <Text style={styles.popularSectionTitle}>인기 채널</Text>
        <View style={styles.popularCardsRow}>
          {popularChannels.slice(0, 3).map((channel) => {
            const isAdding = addingChannelId === channel.channelId;
            return (
              <TouchableOpacity
                key={channel.channelId}
                style={[styles.popularCard, isAdding && styles.popularCardDisabled]}
                onPress={() => handleAddPopularChannel(channel)}
                activeOpacity={0.7}
                disabled={isAdding}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>{`TOP${channel.rank}`}</Text>
                </View>
                {channel.thumbnail ? (
                  <Image
                    source={{ uri: channel.thumbnail }}
                    style={styles.popularThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.popularThumbnail, styles.popularPlaceholder]}>
                    <Text style={styles.popularPlaceholderText}>YT</Text>
                  </View>
                )}
                <Text style={styles.popularTitle} numberOfLines={1}>
                  {channel.title || '제목 없음'}
                </Text>
                {channel.subscriberCount ? (
                  <Text style={styles.popularSubscribers}>
                    구독자 {formatChannelStats(channel.subscriberCount || 0, channel.videoCount || 0).subscribers}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {renderPopularSection({ fullBleed: true })}
      <Text style={styles.myChannelsTitle}>나의 채널</Text>
    </View>
  );

  if (isLoading && channels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>채널 목록을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refreshChannels}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={styles.container}>
        {renderPopularSection({ fullBleed: false })}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>구독 중인 채널이 없습니다</Text>
          <Text style={styles.emptyDescription}>
            우측 상단의 추가 버튼을 사용하여 YouTube 채널을 추가해보세요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item?.id?.toString() || `channel-${Date.now()}-${Math.random()}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(16, tabBarHeight * 0.7) }]}
        refreshControl={refreshControl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  popularSectionWrapper: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  popularSection: {
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#f3f4f6',
  },
  popularSectionFullBleed: {
    marginHorizontal: -16,
  },
  popularSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  myChannelsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  popularCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  popularCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  popularCardDisabled: {
    opacity: 0.6,
  },
  popularBadge: {
    borderWidth: 1,
    borderColor: '#818cf8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  popularThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
  popularPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularPlaceholderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  popularSubscribers: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  channelItem: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  channelItemPressed: {
    backgroundColor: '#f9fafb',
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  placeholderThumbnail: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  channelInfo: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  channelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 13,
    color: '#9ca3af',
  },
  videoCount: {
    fontSize: 13,
    color: '#9ca3af',
  },
  addedDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 1,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
