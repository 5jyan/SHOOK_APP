import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useChannels } from '@/contexts/ChannelsContext';
import { type YoutubeChannel, type UserChannel } from '@/services/api';

interface ChannelListProps {
  onChannelDeleted?: (channelId: string) => void;
  refreshControl?: React.ReactElement;
}

export function ChannelList({ onChannelDeleted, refreshControl }: ChannelListProps) {
  const { channels, isLoading, error, deleteChannel, refreshChannels, channelCount } = useChannels();
  const [deletingChannelId, setDeletingChannelId] = React.useState<string | null>(null);

  console.log('📺 [ChannelList] rendering:', {
    channelCount,
    channelsLength: channels.length,
    isLoading,
    error,
    channelsPreview: channels.slice(0, 2).map(ch => ({ 
      id: ch?.id, 
      title: ch?.youtubeChannel?.title,
      channelId: ch?.youtubeChannel?.channelId 
    }))
  });

  const handleDeleteChannel = (channel: UserChannel) => {
    Alert.alert(
      '채널 삭제',
      `"${channel.youtubeChannel.title}" 채널을 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeletingChannelId(channel.youtubeChannel.channelId);
            try {
              await deleteChannel(channel.youtubeChannel.channelId);
              onChannelDeleted?.(channel.youtubeChannel.channelId);
              Alert.alert('삭제 완료', `"${channel.youtubeChannel.title}" 채널이 삭제되었습니다.`);
            } catch (err) {
              Alert.alert(
                '삭제 실패', 
                err instanceof Error ? err.message : '채널 삭제 중 오류가 발생했습니다.'
              );
            } finally {
              setDeletingChannelId(null);
            }
          },
        },
      ]
    );
  };

  const formatSubscriberCount = (count?: string): string => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M subscribers`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K subscribers`;
    }
    return `${num} subscribers`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderChannelItem = ({ item }: { item: UserChannel }) => {
    // Safety check for item and required properties
    if (!item || !item.youtubeChannel) {
      console.warn('Invalid channel item:', item);
      return null;
    }

    return (
      <View style={styles.channelItem}>
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
            {item.youtubeChannel.handle && (
              <Text style={styles.channelHandle}>@{item.youtubeChannel.handle}</Text>
            )}
            {item.youtubeChannel.subscriberCount && (
              <Text style={styles.subscriberCount}>
                {formatSubscriberCount(item.youtubeChannel.subscriberCount)}
              </Text>
            )}
            <Text style={styles.addedDate}>
              {item.createdAt ? formatDate(item.createdAt) : '날짜 없음'}에 추가됨
            </Text>
          </View>

          <Pressable
            style={[
              styles.deleteButton,
              deletingChannelId === item.youtubeChannel.channelId && styles.disabledButton
            ]}
            onPress={() => handleDeleteChannel(item)}
            disabled={deletingChannelId === item.youtubeChannel.channelId}
          >
            {deletingChannelId === item.youtubeChannel.channelId ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text style={styles.deleteButtonText}>삭제</Text>
            )}
          </Pressable>
        </View>
      </View>
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
          위의 검색 기능을 사용하여 YouTube 채널을 추가해보세요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>구독 중인 채널 ({channelCount}개)</Text>
      </View>
      
      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item?.id?.toString() || `channel-${Date.now()}-${Math.random()}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
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
  channelHandle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  addedDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
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