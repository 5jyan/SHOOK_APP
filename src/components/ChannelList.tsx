import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChannels } from '@/contexts/ChannelsContext';
import { type UserChannel } from '@/services/api';
import { uiLogger } from '@/utils/logger-enhanced';
import { formatChannelStats } from '@/utils/number-format';
import { useQueryClient } from '@tanstack/react-query';
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
  const [deletingChannelId, setDeletingChannelId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>구독 중인 채널이 없습니다</Text>
        <Text style={styles.emptyDescription}>
          우측 상단의 추가 버튼을 사용하여 YouTube 채널을 추가해보세요.
        </Text>
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
    padding: 16,
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