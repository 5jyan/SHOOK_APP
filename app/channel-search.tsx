import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChannels } from '@/contexts/ChannelsContext';
import { useChannelSearch } from '@/hooks/useChannelSearch';
import { apiService, type YoutubeChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';
import { formatChannelStats } from '@/utils/number-format';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChannelSearchScreen() {
  const searchInputRef = React.useRef<TextInput>(null);
  const { user } = useAuthStore();
  const { channelCount, refreshChannels } = useChannels();
  const queryClient = useQueryClient();
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
  
  const [loadingChannelId, setLoadingChannelId] = React.useState<string | null>(null);
  const maxChannels = 3;
  const maxSearchResults = 10; // 검색 결과는 최대 10개
  // manager 역할 사용자는 채널 제한이 없음
  const isChannelLimitReached = user?.role !== 'manager' && channelCount >= maxChannels;

  // Auto-focus on search input after screen transition completes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500); // Increased delay to allow screen transition to complete
    
    return () => clearTimeout(timer);
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleClearPress = () => {
    setSearchTerm('');
    clearSearch();
    searchInputRef.current?.focus();
  };

  const handleAddChannel = async (channel: YoutubeChannel) => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    if (isChannelLimitReached) {
      Alert.alert('채널 한도 초과', `최대 ${maxChannels}개의 채널만 구독할 수 있습니다.`);
      return;
    }

    setLoadingChannelId(channel.channelId);
    try {
      serviceLogger.info('Adding channel', { channelTitle: channel.title, channelId: channel.channelId });
      const response = await apiService.addChannel(channel.channelId);

      if (response.success) {
        serviceLogger.info('Channel added successfully', {
          channelTitle: channel.title,
          hasLatestVideo: !!response.data?.latestVideo,
          videoId: response.data?.latestVideo?.videoId
        });

        // Check if backend returned latest video (existing channel scenario)
        if (response.data?.latestVideo) {
          // Existing channel - add video to cache immediately
          serviceLogger.info('Adding latest video to cache immediately', {
            videoId: response.data.latestVideo.videoId,
            channelTitle: channel.title
          });

          const currentCache = await videoCacheService.getCachedVideos();

          // Log the video data we're about to add
          serviceLogger.info('Video data received from backend', {
            videoId: response.data.latestVideo.videoId,
            title: response.data.latestVideo.title,
            processed: response.data.latestVideo.processed,
            hasSummary: !!response.data.latestVideo.summary,
            summaryLength: response.data.latestVideo.summary?.length || 0,
            processingStatus: response.data.latestVideo.processingStatus
          });

          const updatedCache = [response.data.latestVideo, ...currentCache];
          await videoCacheService.saveVideosToCache(updatedCache);

          // Invalidate TanStack Query cache to trigger re-render
          queryClient.invalidateQueries({ queryKey: ['videoSummariesCached', user?.id] });

          serviceLogger.info('Latest video added to cache and query invalidated', {
            videoId: response.data.latestVideo.videoId
          });
        } else {
          // New channel - video processing in background, signal full sync
          serviceLogger.info('New channel added, signaling channel list change');
          await videoCacheService.signalChannelListChanged();
        }

        Alert.alert('성공', `${channel.title} 채널이 추가되었습니다.`);
        await refreshChannels();
        router.back(); // 성공 시 이전 화면으로 돌아가기
      } else {
        serviceLogger.error('Failed to add channel', { error: response.error, channelTitle: channel.title });
        Alert.alert('오류', response.error || '채널 추가에 실패했습니다.');
      }
    } catch (error) {
      serviceLogger.error('Error adding channel', { error: error instanceof Error ? error.message : String(error), channelTitle: channel.title });
      Alert.alert('오류', '채널 추가 중 오류가 발생했습니다.');
    } finally {
      setLoadingChannelId(null);
    }
  };


  // 애니메이션 하트 컴포넌트
  const AnimatedHeart = ({ isLoading }: { isLoading: boolean }) => {
    const fillProgress = useSharedValue(0);

    React.useEffect(() => {
      if (isLoading) {
        fillProgress.value = withRepeat(
          withTiming(1, { 
            duration: 1000, 
            easing: Easing.inOut(Easing.ease) 
          }),
          -1, // 무한 반복
          true // 역방향 반복
        );
      } else {
        fillProgress.value = withTiming(0, { duration: 300 });
      }
    }, [isLoading]);

    const animatedStyle = useAnimatedStyle(() => {
      const opacity = interpolate(fillProgress.value, [0, 1], [0, 1]);
      return {
        opacity,
      };
    });

    return (
      <View style={styles.heartContainer}>
        {/* 배경 하트 (회색) */}
        <IconSymbol name="heart" size={20} color="#e5e7eb" />
        {/* 애니메이션 하트 (빨간색) */}
        <Animated.View style={[styles.animatedHeart, animatedStyle]}>
          <IconSymbol name="heart.fill" size={20} color="#ef4444" />
        </Animated.View>
      </View>
    );
  };

  const renderChannelItem = ({ item: channel }: { item: YoutubeChannel }) => {
    // Safety check for channel data
    if (!channel || !channel.channelId) {
      return null;
    }

    return (
      <View style={styles.channelItem}>
        <Image
          source={{ uri: channel.thumbnail || 'https://via.placeholder.com/60/4285f4/ffffff?text=C' }}
          style={styles.channelThumbnail}
          resizeMode="cover"
        />
        <View style={styles.channelInfo}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channel.title || 'Unknown Channel'}
          </Text>
          <View style={styles.channelStats}>
            {channel.subscriberCount && (
              <Text style={styles.channelSubscribers}>
                구독자 {formatChannelStats(channel.subscriberCount || 0, channel.videoCount || 0).subscribers}
              </Text>
            )}
            {channel.videoCount && (
              <Text style={styles.channelVideos}>
                동영상 {formatChannelStats(channel.subscriberCount || 0, channel.videoCount || 0).videos}개
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleAddChannel(channel)}
          disabled={loadingChannelId !== null}
          activeOpacity={0.6}
        >
          <AnimatedHeart isLoading={loadingChannelId === channel.channelId} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container}>
        {/* Search Header */}
        <View style={[styles.header, ]}>
          {/* Back Button */}
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#374151" />
          </TouchableOpacity>
          
          {/* Search Input Container */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <IconSymbol name="magnifyingglass" size={18} color="#9ca3af" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="채널 검색"
                placeholderTextColor="#9ca3af"
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={handleClearPress} style={styles.clearButton}>
                  <IconSymbol name="xmark" size={16} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Search Content */}
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {searchTerm.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="magnifyingglass" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>채널을 검색해보세요</Text>
            <Text style={styles.emptyDescription}>
              구독하고 싶은 YouTube 채널을 검색할 수 있습니다
            </Text>
            {isChannelLimitReached && (
              <Text style={styles.limitWarning}>
                현재 최대 {maxChannels}개 채널을 구독 중입니다
              </Text>
            )}
            {user?.role === 'manager' && channelCount >= maxChannels && (
              <Text style={styles.managerInfo}>
                매니저 권한으로 무제한 채널 구독 가능
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.searchResults}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285f4" />
                <Text style={styles.loadingText}>&ldquo;{searchTerm}&rdquo; 검색 중...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <IconSymbol name="exclamationmark.triangle" size={48} color="#ef4444" />
                <Text style={styles.errorTitle}>검색 오류</Text>
                <Text style={styles.errorDescription}>{error}</Text>
              </View>
            ) : channels.length === 0 && searchTerm.length >= 2 ? (
              <View style={styles.noResultsContainer}>
                <IconSymbol name="magnifyingglass" size={48} color="#d1d5db" />
                <Text style={styles.noResultsTitle}>검색 결과가 없습니다</Text>
                <Text style={styles.noResultsDescription}>
                  다른 검색어를 시도해보세요
                </Text>
              </View>
            ) : (
              <View style={styles.channelListContainer}>
                {channels.slice(0, maxSearchResults).map((channel) => (
                  <View key={channel.channelId}>
                    {renderChannelItem({ item: channel })}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
    marginRight: 4,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  searchResults: {
    flex: 1,
  },
  searchingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
  channelList: {
    paddingVertical: 8,
  },
  channelListContainer: {
    paddingVertical: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  channelThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  channelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelSubscribers: {
    fontSize: 13,
    color: '#9ca3af',
  },
  channelVideos: {
    fontSize: 13,
    color: '#9ca3af',
  },
  heartButton: {
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  limitWarning: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  managerInfo: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  heartContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedHeart: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});