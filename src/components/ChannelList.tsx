import { useChannels } from '@/contexts/ChannelsContext';
import { apiService, type PopularChannel, type UserChannel } from '@/services/api';
import { popularChannelsCacheService } from '@/services/popular-channels-cache';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { videoSummariesSyncService } from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import { formatChannelStats } from '@/utils/number-format';
import { TEST_IDS } from '@/constants/test-ids';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { ShookLoadingScreen } from '@/components/ShookLoadingScreen';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  type RefreshControlProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

interface ChannelListProps {
  onChannelDeleted?: (channelId: string) => void;
  onChannelAdded?: (channelId: string) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  tabBarHeight?: number;
}

export function ChannelList({ onChannelDeleted, onChannelAdded, refreshControl, tabBarHeight = 0 }: ChannelListProps) {
  const { width } = useWindowDimensions();
  const { channels, isLoading, error, deleteChannel, refreshChannels, channelCount } = useChannels();
  const { user } = useAuthStore();
  const [deletingChannelId, setDeletingChannelId] = React.useState<string | null>(null);
  const [addingChannelId, setAddingChannelId] = React.useState<string | null>(null);
  const [cachedPopularChannels, setCachedPopularChannels] = React.useState<PopularChannel[]>([]);
  const queryClient = useQueryClient();
  const maxChannels = 7;
  const isChannelLimitReached = user?.role !== 'manager' && channelCount >= maxChannels;
  const contentWidth = Math.min(width, 752);

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
          await videoSummariesSyncService.publishCachedData(queryClient, user?.id);
          await videoSummariesSyncService.markSyncNeeded(user?.id);
          await queryClient.invalidateQueries({
            queryKey: ['videoSummariesCached', user?.id],
            refetchType: 'none',
          });
        }

        await refreshChannels();
        onChannelAdded?.(channel.channelId);
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
      Alert.alert('이미 추가됨', '이미 추가한 채널입니다.');
      return;
    }

    if (user.isGuest === true && user.role !== 'tester' && user.role !== 'manager' && channelCount >= 1) {
      Alert.alert(
        '계정 연동이 필요해요',
        '게스트 계정은 채널 1개까지 추가할 수 있어요. 계정을 연동하면 채널을 더 추가할 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '계정 연동', onPress: () => router.push('/sns-link') },
        ],
      );
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
        testID={TEST_IDS.channels.row(item.youtubeChannel.channelId)}
        accessibilityRole="button"
        accessibilityLabel={`${item.youtubeChannel.title} 채널 요약 보기`}
        style={({ pressed }) => [
          styles.channelItem,
          pressed && styles.channelItemPressed
        ]}
        onPress={() => handleChannelPress(item)}
        android_ripple={{ color: SummaryTheme.colors.pressed, borderless: false }}
      >
        <TouchableOpacity
          testID={TEST_IDS.channels.delete(item.youtubeChannel.channelId)}
          accessibilityRole="button"
          accessibilityLabel={`${item.youtubeChannel.title} 채널 구독 취소`}
          style={styles.removeButton}
          onPress={(e) => {
            // Prevent parent Pressable from firing
            e.stopPropagation();
            handleUnsubscribeChannel(item);
          }}
          disabled={deletingChannelId === item.youtubeChannel.channelId}
          activeOpacity={0.6}
        >
          {deletingChannelId === item.youtubeChannel.channelId ? (
            <ActivityIndicator size="small" color={SummaryTheme.colors.textMuted} />
          ) : (
            <MaterialCommunityIcons name="minus-circle-outline" size={22} color={SummaryTheme.colors.textMuted} />
          )}
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
              <Text style={styles.placeholderText} allowFontScaling={false}>YT</Text>
            </View>
          )}

          <View style={styles.channelInfo}>
            <Text style={styles.channelTitle} numberOfLines={2} allowFontScaling={false}>
              {item.youtubeChannel.title || '제목 없음'}
            </Text>
            <View style={styles.channelStats}>
                {item.youtubeChannel.subscriberCount && (
                  <Text style={styles.subscriberCount} allowFontScaling={false}>
                    구독자 {formatChannelStats(item.youtubeChannel.subscriberCount || 0, item.youtubeChannel.videoCount || 0).subscribers}
                  </Text>
                )}
                {item.youtubeChannel.videoCount && (
                  <Text style={styles.videoCount} allowFontScaling={false}>
                    동영상 {formatChannelStats(item.youtubeChannel.subscriberCount || 0, item.youtubeChannel.videoCount || 0).videos}개
                  </Text>
                )}
              </View>
            <Text style={styles.addedDate} allowFontScaling={false}>
              {item.createdAt ? formatDate(item.createdAt) : '날짜 없음'}에 추가됨
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={SummaryTheme.colors.textMuted} />
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
        <Text style={styles.popularSectionTitle} allowFontScaling={false}>인기 채널</Text>
        <View style={styles.popularCardsRow}>
          {popularChannels.slice(0, 3).map((channel) => {
            const isAdding = addingChannelId === channel.channelId;
            return (
              <TouchableOpacity
                key={channel.channelId}
                testID={TEST_IDS.channels.popular(channel.channelId)}
                style={[styles.popularCard, isAdding && styles.popularCardDisabled]}
                onPress={() => handleAddPopularChannel(channel)}
                activeOpacity={0.7}
                disabled={isAdding}
                accessibilityRole="button"
                accessibilityLabel={`${channel.title || '추천'} 채널 추가`}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText} allowFontScaling={false}>{`TOP${channel.rank}`}</Text>
                </View>
                {channel.thumbnail ? (
                  <Image
                    source={{ uri: channel.thumbnail }}
                    style={styles.popularThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.popularThumbnail, styles.popularPlaceholder]}>
                    <Text style={styles.popularPlaceholderText} allowFontScaling={false}>YT</Text>
                  </View>
                )}
                <Text style={styles.popularTitle} numberOfLines={1} allowFontScaling={false}>
                  {channel.title || '제목 없음'}
                </Text>
                {channel.subscriberCount ? (
                  <Text style={styles.popularSubscribers} allowFontScaling={false}>
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
      <Text
        style={[
          styles.myChannelsTitle,
          !showPopularSection && styles.myChannelsTitleStandalone,
        ]}
        allowFontScaling={false}
      >
        나의 채널
      </Text>
    </View>
  );

  if (isLoading && channels.length === 0) {
    return (
      <ShookLoadingScreen message="채널 목록을 불러오는 중..." />
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refreshChannels}>
          <Text style={styles.retryButtonText} allowFontScaling={false}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={styles.container}>
        {renderPopularSection({ fullBleed: false })}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle} allowFontScaling={false}>추가한 채널이 없습니다</Text>
          <Text style={styles.emptyDescription} allowFontScaling={false}>
            우측 상단의 추가 버튼을 사용하여 YouTube 채널을 추가해보세요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <FlatList
        testID={TEST_IDS.channels.list}
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item?.id?.toString() || `channel-${Date.now()}-${Math.random()}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={[
          styles.listContainer,
          {
            width: contentWidth,
            paddingBottom: Math.max(32, tabBarHeight + 16),
          },
        ]}
        refreshControl={refreshControl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SummaryTheme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SummaryTheme.colors.border,
    backgroundColor: SummaryTheme.colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
  },
  listContainer: {
    alignSelf: 'center',
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
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: SummaryTheme.colors.background,
  },
  popularSectionFullBleed: {
    marginHorizontal: -16,
  },
  popularSectionEyebrow: {
    color: SummaryTheme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  popularSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  myChannelsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 14,
  },
  myChannelsTitleStandalone: {
    marginTop: 16,
  },
  popularCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  popularCard: {
    flex: 1,
    backgroundColor: SummaryTheme.colors.accentSoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  popularCardDisabled: {
    opacity: 0.6,
  },
  popularBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 8,
    backgroundColor: SummaryTheme.colors.accentSoft,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: SummaryTheme.colors.accent,
  },
  popularThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
  popularPlaceholder: {
    backgroundColor: SummaryTheme.colors.pending,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularPlaceholderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: SummaryTheme.colors.textSecondary,
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  popularSubscribers: {
    fontSize: 11,
    color: SummaryTheme.colors.textMuted,
    textAlign: 'center',
  },
  channelItem: {
    position: 'relative',
    backgroundColor: SummaryTheme.colors.surface,
    borderRadius: SummaryTheme.radius.card,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  channelItemPressed: {
    backgroundColor: SummaryTheme.colors.pressed,
    opacity: 0.82,
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  placeholderThumbnail: {
    backgroundColor: SummaryTheme.colors.pending,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: SummaryTheme.colors.textSecondary,
  },
  channelInfo: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 6,
  },
  channelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 13,
    color: SummaryTheme.colors.textSecondary,
  },
  videoCount: {
    fontSize: 13,
    color: SummaryTheme.colors.textSecondary,
  },
  addedDate: {
    fontSize: 11,
    color: SummaryTheme.colors.textMuted,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: SummaryTheme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: SummaryTheme.colors.onAccent,
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
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
