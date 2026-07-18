import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChannels } from '@/contexts/ChannelsContext';
import { useChannelSearch } from '@/hooks/useChannelSearch';
import { apiService, type YoutubeChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';
import { formatChannelStats } from '@/utils/number-format';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { videoSummariesSyncService } from '@/services/video-summaries-sync';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEST_IDS } from '@/constants/test-ids';
import { SummaryTheme } from '@/constants/SummaryTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

function SearchLoadingState({ searchTerm }: { searchTerm: string }) {
  const dots = React.useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  React.useEffect(() => {
    const animations = dots.map((dot, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 120),
        Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.delay((2 - index) * 120),
      ])
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel={`${searchTerm} 채널 검색 중`}>
      <View style={styles.loadingMark}>
        <MaterialCommunityIcons name="youtube" size={27} color={SummaryTheme.colors.accent} />
      </View>
      <View style={styles.loadingDots}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.loadingDot,
              {
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.loadingTitle}>채널을 찾고 있어요</Text>
      <Text style={styles.loadingText}>“{searchTerm}” 검색 결과를 준비하는 중입니다</Text>
    </View>
  );
}

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
    clearSearch,
  } = useChannelSearch();
  
  const [loadingChannelId, setLoadingChannelId] = React.useState<string | null>(null);
  const maxChannels = 7;
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
        const latestVideos = response.data?.latestVideos?.length
          ? response.data.latestVideos
          : response.data?.latestVideo
            ? [response.data.latestVideo]
            : [];

        serviceLogger.info('Channel added successfully', {
          channelTitle: channel.title,
          latestVideosCount: latestVideos.length,
        });

        if (latestVideos.length > 0) {
          serviceLogger.info('Merging latest videos into cache', {
            videoIds: latestVideos.map((video) => video.videoId),
            channelTitle: channel.title
          });

          await videoCacheService.mergeVideos(latestVideos);

          // The summaries query may still be inside its one-minute sync throttle.
          // Mark it dirty first so an already-mounted Android tab cannot reuse
          // stale in-memory data instead of the pending videos just cached.
          await videoSummariesSyncService.markSyncNeeded(user.id);
          await queryClient.invalidateQueries({ queryKey: ['videoSummariesCached', user.id] });
        } else {
          // New channel - video processing in background
          // Don't signal channel list change - let incremental sync handle it naturally
          serviceLogger.info('New channel added, will sync via incremental updates');
        }

        await refreshChannels();
        router.replace({
          pathname: '/(tabs)/channels',
          params: {
            showChannelAddedGuide: '1',
            addedChannelId: channel.channelId,
          },
        });
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


  const renderChannelItem = ({ item: channel }: { item: YoutubeChannel }) => {
    // Safety check for channel data
    if (!channel || !channel.channelId) {
      return null;
    }

    return (
      <View testID={TEST_IDS.channels.row(channel.channelId)} style={styles.channelItem}>
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
            {!!channel.subscriberCount && (
              <Text style={styles.channelSubscribers}>
                구독자 {formatChannelStats(channel.subscriberCount || 0, channel.videoCount || 0).subscribers}
              </Text>
            )}
            {!!channel.videoCount && (
              <Text style={styles.channelVideos}>
                동영상 {formatChannelStats(channel.subscriberCount || 0, channel.videoCount || 0).videos}개
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          testID={TEST_IDS.channels.add(channel.channelId)}
          accessibilityRole="button"
          accessibilityLabel={`${channel.title} 채널 추가`}
          style={[styles.addResultButton, loadingChannelId !== null && styles.addResultButtonDisabled]}
          onPress={() => handleAddChannel(channel)}
          disabled={loadingChannelId !== null}
          activeOpacity={0.6}
        >
          {loadingChannelId === channel.channelId ? (
            <ActivityIndicator size="small" color={SummaryTheme.colors.onAccent} />
          ) : (
            <>
              <MaterialCommunityIcons name="plus" size={17} color={SummaryTheme.colors.onAccent} />
              <Text style={styles.addResultButtonText}>추가</Text>
            </>
          )}
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
      <SafeAreaView testID={TEST_IDS.screens.channelSearch} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            testID={TEST_IDS.channels.searchBack}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={SummaryTheme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>채널 추가</Text>
          </View>
          <View style={styles.channelCapacity} accessibilityLabel={`채널 ${channelCount}/${maxChannels}`}>
            <Text style={styles.channelCapacityText}>{channelCount}/{user?.role === 'manager' ? '∞' : maxChannels}</Text>
          </View>
        </View>

        <View style={styles.searchArea}>
          <Text style={styles.searchGuide}>YouTube 채널 이름을 입력하세요</Text>
          <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={22} color={SummaryTheme.colors.textMuted} />
              <TextInput
                testID={TEST_IDS.channels.searchInput}
                accessibilityLabel="채널 검색어"
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="예: 슈카월드"
                placeholderTextColor={SummaryTheme.colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity
                  testID={TEST_IDS.channels.searchClear}
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                  onPress={handleClearPress}
                  style={styles.clearButton}
                >
                  <MaterialCommunityIcons name="close" size={18} color={SummaryTheme.colors.textSecondary} />
                </TouchableOpacity>
              )}
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
              채널을 추가하면 새 영상이 올라올 때 핵심 요약을 자동으로 준비합니다.
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
            {searchTerm.trim().length < 2 ? (
              <View style={styles.minimumQueryContainer} accessibilityLiveRegion="polite">
                <MaterialCommunityIcons name="form-textbox" size={38} color={SummaryTheme.colors.textMuted} />
                <Text style={styles.minimumQueryTitle}>2글자 이상 입력해주세요</Text>
                <Text style={styles.minimumQueryDescription}>채널 이름을 두 글자 이상 입력하면 검색을 시작합니다.</Text>
              </View>
            ) : isLoading ? (
              <SearchLoadingState searchTerm={searchTerm} />
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
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsEyebrow}>SEARCH RESULTS</Text>
                  <Text style={styles.resultsCount}>{Math.min(channels.length, maxSearchResults)}개 채널</Text>
                </View>
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
  container: { flex: 1, backgroundColor: SummaryTheme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64,
    paddingHorizontal: 12, backgroundColor: SummaryTheme.colors.background,
  },
  backButton: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  headerTitleGroup: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerEyebrow: { color: SummaryTheme.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: SummaryTheme.colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 2 },
  channelCapacity: {
    minWidth: 48, height: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SummaryTheme.colors.accentSoft, borderRadius: 16,
  },
  channelCapacityText: { color: SummaryTheme.colors.accent, fontSize: 13, fontWeight: '800' },
  searchArea: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  searchGuide: { color: SummaryTheme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center', minHeight: 56,
    backgroundColor: SummaryTheme.colors.surface, borderWidth: 1,
    borderColor: SummaryTheme.colors.border, borderRadius: 18, paddingLeft: 16, paddingRight: 6,
  },
  searchInput: {
    flex: 1, fontSize: 16, color: SummaryTheme.colors.textPrimary,
    marginLeft: 10, paddingVertical: 12,
  },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  content: { flex: 1 },
  emptyState: {
    alignItems: 'center', marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 32, backgroundColor: SummaryTheme.colors.surface,
    borderWidth: 1, borderColor: SummaryTheme.colors.border, borderRadius: SummaryTheme.radius.card,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: '800', color: SummaryTheme.colors.textPrimary,
    marginTop: 16, marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16, color: SummaryTheme.colors.textSecondary, textAlign: 'center', lineHeight: 24,
  },
  searchResults: { flex: 1 },
  minimumQueryContainer: {
    alignItems: 'center', marginHorizontal: 16, marginTop: 8, paddingHorizontal: 24, paddingVertical: 32,
    backgroundColor: SummaryTheme.colors.surface, borderWidth: 1,
    borderColor: SummaryTheme.colors.border, borderRadius: SummaryTheme.radius.card,
  },
  minimumQueryTitle: {
    marginTop: 14, color: SummaryTheme.colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center',
  },
  minimumQueryDescription: {
    marginTop: 7, color: SummaryTheme.colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center',
  },
  channelListContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  resultsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 6,
  },
  resultsEyebrow: { color: SummaryTheme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  resultsCount: { color: SummaryTheme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  channelItem: {
    flexDirection: 'row', alignItems: 'center', minHeight: 78, padding: 12, marginBottom: 10,
    backgroundColor: SummaryTheme.colors.surface, borderWidth: 1,
    borderColor: SummaryTheme.colors.border, borderRadius: 18,
  },
  channelThumbnail: { width: 52, height: 52, borderRadius: 18, backgroundColor: SummaryTheme.colors.pending },
  channelInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  channelTitle: {
    fontSize: 16, fontWeight: '700', color: SummaryTheme.colors.textPrimary, marginBottom: 5,
  },
  channelStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  channelSubscribers: { fontSize: 13, color: SummaryTheme.colors.textMuted },
  channelVideos: { fontSize: 13, color: SummaryTheme.colors.textMuted },
  addResultButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    minWidth: 68, minHeight: 44, paddingHorizontal: 12,
    backgroundColor: SummaryTheme.colors.accent, borderRadius: 14,
  },
  addResultButtonDisabled: { opacity: 0.55 },
  addResultButtonText: { color: SummaryTheme.colors.onAccent, fontSize: 14, fontWeight: '800' },
  loadingContainer: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  loadingMark: {
    width: 64, height: 64, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SummaryTheme.colors.accentSoft, borderRadius: 22,
  },
  loadingDots: { height: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 18 },
  loadingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SummaryTheme.colors.accent },
  loadingTitle: { marginTop: 10, color: SummaryTheme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  loadingText: { fontSize: 14, color: SummaryTheme.colors.textSecondary, marginTop: 6, textAlign: 'center' },
  errorContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#ef4444', marginTop: 16, marginBottom: 8 },
  errorDescription: {
    fontSize: 16, color: SummaryTheme.colors.textSecondary, textAlign: 'center', lineHeight: 24,
  },
  noResultsContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  noResultsTitle: {
    fontSize: 20, fontWeight: '700', color: SummaryTheme.colors.textPrimary, marginTop: 16, marginBottom: 8,
  },
  noResultsDescription: {
    fontSize: 16, color: SummaryTheme.colors.textSecondary, textAlign: 'center', lineHeight: 24,
  },
  limitWarning: { fontSize: 14, color: '#b86f00', textAlign: 'center', marginTop: 16, fontWeight: '700' },
  managerInfo: { fontSize: 14, color: '#16845b', textAlign: 'center', marginTop: 16, fontWeight: '700' },
});
