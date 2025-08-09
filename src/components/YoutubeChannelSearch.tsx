import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  FlatList, 
  Image, 
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { useChannelSearch } from '@/hooks/useChannelSearch';
import { useChannels } from '@/contexts/ChannelsContext';
import { apiService, type YoutubeChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

interface YoutubeChannelSearchProps {
  onChannelAdded?: (channel: YoutubeChannel) => void;
  maxChannels?: number;
  currentChannelCount?: number; // Keep for backward compatibility, but use internal count
}

export function YoutubeChannelSearch({
  onChannelAdded,
  maxChannels = 3,
  currentChannelCount = 0, // Fallback value
}: YoutubeChannelSearchProps) {
  const { user } = useAuthStore();
  const { channelCount, refreshChannels } = useChannels(); // Get real-time channel count from shared context
  const {
    searchTerm,
    setSearchTerm,
    channels,
    isLoading,
    error,
    selectedChannel,
    setSelectedChannel,
    clearSearch,
  } = useChannelSearch();

  const [isAddingChannel, setIsAddingChannel] = React.useState(false);

  // Use the real-time channel count from the context instead of the prop
  const currentCount = channelCount || currentChannelCount;
  const isChannelLimitReached = currentCount >= maxChannels;

  const handleAddChannel = async (channel?: YoutubeChannel) => {
    const channelToAdd = channel || selectedChannel;
    
    if (!channelToAdd) {
      Alert.alert('채널 선택 필요', '먼저 검색하여 채널을 선택해주세요.');
      return;
    }

    if (!user) {
      Alert.alert('인증 필요', '채널을 추가하려면 로그인이 필요합니다.');
      return;
    }

    if (isChannelLimitReached) {
      Alert.alert('채널 개수 제한', `최대 ${maxChannels}개의 채널만 추가할 수 있습니다.`);
      return;
    }

    setIsAddingChannel(true);

    try {
      console.log('📤 Adding channel:', channelToAdd.title);
      const response = await apiService.addChannel(channelToAdd.channelId);
      
      if (response.success) {
        console.log('✅ [YoutubeChannelSearch] Channel added successfully:', response.data);
        Alert.alert(
          '채널 추가 성공', 
          `"${channelToAdd.title}" 채널이 성공적으로 추가되었습니다.`,
          [{ 
            text: '확인', 
            onPress: () => {
              console.log('🔄 [YoutubeChannelSearch] Alert confirmed, refreshing shared channels');
              refreshChannels();
              onChannelAdded?.(channelToAdd);
            } 
          }]
        );
        clearSearch();
      } else {
        console.error('❌ Failed to add channel:', response.error);
        Alert.alert('채널 추가 실패', response.error || '채널 추가 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('❌ Channel add error:', err);
      Alert.alert(
        '채널 추가 실패', 
        err instanceof Error ? err.message : '채널 추가 중 오류가 발생했습니다.'
      );
    } finally {
      setIsAddingChannel(false);
    }
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

  const renderChannelItem = ({ item }: { item: YoutubeChannel }) => (
    <Pressable
      style={[
        styles.channelItem,
        selectedChannel?.channelId === item.channelId && styles.selectedChannelItem
      ]}
      onPress={() => setSelectedChannel(item)}
      onLongPress={() => handleAddChannel(item)}
    >
      <View style={styles.channelContent}>
        {item.thumbnail ? (
          <Image 
            source={{ uri: item.thumbnail }} 
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
            {item.title}
          </Text>
          {item.handle && (
            <Text style={styles.channelHandle}>@{item.handle}</Text>
          )}
          {item.subscriberCount && (
            <Text style={styles.subscriberCount}>
              {formatSubscriberCount(item.subscriberCount)}
            </Text>
          )}
        </View>
      </View>
      
      {selectedChannel?.channelId === item.channelId && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>선택됨</Text>
        </View>
      )}
    </Pressable>
  );

  console.log('🔍 [YoutubeChannelSearch] rendering:', { 
    searchTerm, 
    channelsCount: channels.length, 
    isLoading, 
    error,
    channelCountFromContext: channelCount,
    channelCountFromProp: currentChannelCount,
    currentCount,
    isChannelLimitReached 
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>YouTube 채널 검색</Text>
        <Text style={styles.subtitle}>
          추가하려는 YouTube 채널의 이름을 검색해주세요.
        </Text>
        {isChannelLimitReached && (
          <Text style={styles.warningText}>
            채널 추가 최대 개수({maxChannels}개)에 도달했습니다. (현재: {currentCount}개)
          </Text>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput, 
            isChannelLimitReached && styles.disabledInput
          ]}
          placeholder={
            isChannelLimitReached 
              ? "채널 추가 최대 개수에 도달했습니다." 
              : "채널 이름 입력"
          }
          value={searchTerm}
          onChangeText={setSearchTerm}
          editable={!isLoading && !isAddingChannel && !isChannelLimitReached}
          placeholderTextColor="#9ca3af"
        />
        
        <Pressable
          style={[
            styles.addButton,
            (!selectedChannel || isAddingChannel || isChannelLimitReached) && styles.disabledButton
          ]}
          onPress={() => handleAddChannel()}
          disabled={!selectedChannel || isAddingChannel || isChannelLimitReached}
        >
          {isAddingChannel ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.addButtonText}>
              채널 추가
            </Text>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4285f4" />
          <Text style={styles.loadingText}>검색 중...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {channels.length > 0 && (
        <View style={styles.channelList}>
          {channels.map((channel) => (
            <View key={channel.channelId}>
              {renderChannelItem({ item: channel })}
            </View>
          ))}
        </View>
      )}

      {searchTerm.length > 0 && !isLoading && channels.length === 0 && !error && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            "{searchTerm}"에 대한 검색 결과가 없습니다.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  addButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  channelList: {
    maxHeight: 300,
  },
  channelItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
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
  selectedChannelItem: {
    borderColor: '#4285f4',
    backgroundColor: '#f0f8ff',
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  placeholderThumbnail: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
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
    marginBottom: 2,
  },
  channelHandle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4285f4',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  noResultsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
});