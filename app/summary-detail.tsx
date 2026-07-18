import { ShookLoadingScreen } from '@/components/ShookLoadingScreen';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUserChannelsCached } from '@/hooks/useUserChannelsCached';
import { useVideoSummaryDetail } from '@/hooks/useVideoSummaryDetail';
import { transformVideoSummaryToCardData } from '@/hooks/useVideoSummariesCached';
import { getVideoSummariesQueryKey, type CacheAwareData, videoSummariesSyncService } from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { parseSummary } from '@/utils/summary-parser';
import { buildYouTubeTimestampUrl } from '@/utils/youtube-url';
import { useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextProps,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiLogger } from '../src/utils/logger-enhanced';
import { TEST_IDS } from '@/constants/test-ids';
import { FontScaleLimit, SummaryTheme } from '@/constants/SummaryTheme';

const SUMMARY_TEXT_SCALE_LIMIT = FontScaleLimit.content;
const SUMMARY_TEXT_SCALE_MIN = 0.9;

function ResponsiveSummaryText({
  baseSize,
  baseLineHeight,
  style,
  ...props
}: TextProps & { baseSize: number; baseLineHeight?: number }) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(SUMMARY_TEXT_SCALE_LIMIT, Math.max(SUMMARY_TEXT_SCALE_MIN, fontScale));

  return (
    <Text
      {...props}
      allowFontScaling={false}
      lineBreakStrategyIOS="hangul-word"
      style={[
        style,
        {
          fontSize: baseSize * scale,
          ...(baseLineHeight ? { lineHeight: baseLineHeight * scale } : {}),
        },
      ]}
    />
  );
}

export default function SummaryDetailScreen() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - insets.left - insets.right, 752);
  const params = useLocalSearchParams();
  const videoId = params.summaryId as string;
  const fromNotification = params.fromNotification === 'true';
  const [collapsedSections, setCollapsedSections] = React.useState<Set<number>>(new Set());

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const backgroundSyncTriggered = React.useRef(false);
  const { data: videoSummary, isLoading, error } = useVideoSummaryDetail(videoId, { fromNotification });
  const { channels } = useUserChannelsCached();

  // Background sync to refresh summaries list while viewing detail from notification
  React.useEffect(() => {
    if (!fromNotification || backgroundSyncTriggered.current) {
      return;
    }
    if (!user?.id) {
      return;
    }

    backgroundSyncTriggered.current = true;

    const queryKey = getVideoSummariesQueryKey(user.id);
    const existingData = queryClient.getQueryData<CacheAwareData>(queryKey);
    const existingCursor = existingData?.nextCursor ?? null;

    videoSummariesSyncService.syncInBackground({
      userId: user.id,
      existingCursor,
      queryClient,
      reason: 'notification-detail'
    }).catch((syncError) => {
      uiLogger.error('Background summaries sync failed', {
        error: syncError instanceof Error ? syncError.message : String(syncError)
      });
    });
  }, [fromNotification, queryClient, user?.id]);
  
  // Transform to get channel information using cached data (includes real thumbnails)
  const cardData = React.useMemo(() => {
    if (!videoSummary) return null;

    // Debug logging
    uiLogger.debug('SummaryDetail - transforming video data', {
      videoId: videoSummary.videoId,
      channelId: videoSummary.channelId,
      channelTitle: videoSummary.channelTitle,
      channelsAvailable: channels.length,
      channelIds: channels.map(ch => ch.youtubeChannel.channelId)
    });

    const result = transformVideoSummaryToCardData(videoSummary, channels, videoSummary.channelTitle);

    uiLogger.debug('SummaryDetail - transform result', {
      hasChannelThumbnail: !!result.channelThumbnail,
      channelThumbnail: result.channelThumbnail,
      channelName: result.channelName
    });

    return result;
  }, [videoSummary, channels]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ShookLoadingScreen message="요약을 불러오는 중..." />
      </SafeAreaView>
    );
  }
  
  // Show error state with loading screen
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ShookLoadingScreen message="요약을 불러오는 중..." />
      </SafeAreaView>
    );
  }

  // Show loading screen if no video summary found or summary not ready yet
  if (!videoSummary || !videoSummary.summary || !videoSummary.processed) {
    return (
      <SafeAreaView style={styles.container}>
        <ShookLoadingScreen message="요약을 불러오는 중..." />
      </SafeAreaView>
    );
  }

  const handleBackPress = () => {
    router.back();
  };

  const handleSharePress = async () => {
    try {
      const youtubeUrl = `https://youtube.com/watch?v=${videoSummary.videoId}`;
      const summary = videoSummary.summary || '요약이 아직 생성되지 않았습니다.';
      const channelName = cardData?.channelName || videoSummary.channelTitle || 'Unknown Channel';
      const shareMessage = `채널: ${channelName}\n제목: ${videoSummary.title}\n\n${summary}\n\n영상 보기: ${youtubeUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: videoSummary.title,
      });
    } catch (error) {
      uiLogger.error('Share operation failed', { 
        error: error instanceof Error ? error.message : String(error),
        videoId: videoSummary.videoId,
        videoTitle: videoSummary.title
      });
    }
  };

  const handleOpenVideo = () => {
    const youtubeUrl = `https://youtube.com/watch?v=${videoSummary.videoId}`;
    Linking.openURL(youtubeUrl);
  };

  const handleOpenVideoAt = (timestampSeconds: number) => {
    const youtubeUrl = buildYouTubeTimestampUrl(videoSummary.videoId, timestampSeconds);
    Linking.openURL(youtubeUrl);
  };

  const toggleSection = (index: number) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBullets = (items: string[], keyPrefix: string) => items.map((item, index) => {
    return (
      <View
        key={`${keyPrefix}-${index}`}
        style={[styles.bulletItem, index === items.length - 1 && styles.bulletItemLast]}
      >
        <ResponsiveSummaryText baseSize={15} baseLineHeight={24} style={styles.bulletPoint}>•</ResponsiveSummaryText>
        <View style={styles.bulletTextContainer}>
          <ResponsiveSummaryText
            baseSize={15}
            baseLineHeight={24}
            style={styles.bulletText}
          >
            {renderInlineBold(item)}
          </ResponsiveSummaryText>
        </View>
      </View>
    );
  });

  const renderInlineBold = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    text.split(/(\*\*[^*]+\*\*)/g).forEach((part, index) => {
      if (!part) return;

      const isBold = part.startsWith('**') && part.endsWith('**');
      const content = isBold ? part.slice(2, -2) : part;
      nodes.push(
        <Text key={`text-${index}`} allowFontScaling={false} style={isBold ? styles.inlineBold : undefined}>
          {content}
        </Text>,
      );
    });

    return nodes;
  };

  const renderFormattedSummary = (summary: string) => {
    const parsed = parseSummary(summary);
    const hasStructuredContent = parsed.overview.length > 0
      || parsed.keyFacts.length > 0
      || parsed.sections.length > 0
      || parsed.conclusion.length > 0;

    if (!hasStructuredContent) {
      return renderBullets(parsed.fallback, 'fallback');
    }

    return (
      <>
        {parsed.overview.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.sectionEyebrowRow}>
              <View style={styles.sectionAccent} />
              <ResponsiveSummaryText baseSize={11} style={styles.sectionEyebrow}>SUMMARY</ResponsiveSummaryText>
            </View>
            <ResponsiveSummaryText baseSize={24} style={styles.overviewTitle}>한눈에 보기</ResponsiveSummaryText>
            {renderBullets(parsed.overview, 'overview')}
          </View>
        )}

        {parsed.keyFacts.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.sectionEyebrowRow}>
              <View style={styles.sectionAccent} />
              <ResponsiveSummaryText baseSize={11} style={styles.sectionEyebrow}>KEY FACTS</ResponsiveSummaryText>
            </View>
            <ResponsiveSummaryText baseSize={24} style={styles.overviewTitle}>주요 숫자</ResponsiveSummaryText>
            {renderBullets(parsed.keyFacts, 'key-facts')}
          </View>
        )}

        {parsed.sections.length > 0 && (
          <View style={styles.detailsSection}>
            {parsed.sections.map((section, index) => {
              const hasCoreHeading = parsed.sections[0]?.title.trim() === '핵심 내용';
              const expanded = !collapsedSections.has(index);
              const isCoreHeading = hasCoreHeading && index === 0;
              const displayNumber = index + 1 - (hasCoreHeading ? 1 : 0);
              return (
                <View key={`section-${index}`} style={styles.detailCard}>
                  <View style={styles.detailHeader}>
                    <TouchableOpacity
                      style={styles.detailToggle}
                      onPress={() => toggleSection(index)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${section.title} ${expanded ? '접기' : '펼치기'}`}
                    >
                      {!isCoreHeading && (
                        <View style={styles.detailNumberBadge}>
                          <ResponsiveSummaryText
                            baseSize={17}
                            baseLineHeight={24}
                            style={styles.detailNumber}
                          >
                            {String(displayNumber).padStart(2, '0')}
                          </ResponsiveSummaryText>
                        </View>
                      )}
                      <View style={styles.detailTitleContainer}>
                        <ResponsiveSummaryText
                          baseSize={17}
                          style={[styles.detailTitle, isCoreHeading && styles.coreHeadingTitle]}
                        >
                          {section.title}
                        </ResponsiveSummaryText>
                      </View>
                    </TouchableOpacity>
                    {section.timestampSeconds !== undefined && (
                      <TouchableOpacity
                        style={styles.youtubeButton}
                        onPress={() => handleOpenVideoAt(section.timestampSeconds!)}
                        activeOpacity={0.65}
                        accessibilityRole="link"
                        accessibilityLabel={`${section.title} 유튜브에서 보기`}
                      >
                        <MaterialCommunityIcons name="youtube" size={20} color="#ff0000" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.collapseButton}
                      onPress={() => toggleSection(index)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${section.title} ${expanded ? '접기' : '펼치기'}`}
                    >
                      <IconSymbol
                        name={expanded ? 'chevron.up' : 'chevron.down'}
                        size={14}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                  {expanded && section.bullets.length > 0 && (
                    <View style={styles.detailBody}>
                      {renderBullets(section.bullets, `section-${index}`)}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {parsed.conclusion.length > 0 && (
          <View style={styles.conclusionCard}>
            <ResponsiveSummaryText baseSize={18} style={styles.summarySectionTitle}>결론</ResponsiveSummaryText>
            {renderBullets(parsed.conclusion, 'conclusion')}
          </View>
        )}

        {parsed.fallback.length > 0 && (
          <View style={styles.fallbackSection}>
            {renderBullets(parsed.fallback, 'extra')}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView
      testID={TEST_IDS.screens.summaryDetail}
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.detailNav}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={handleBackPress}
          style={styles.navButton}
          activeOpacity={0.65}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={SummaryTheme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.navTitleGroup}>
          <ResponsiveSummaryText baseSize={17} style={styles.navTitle}>요약 노트</ResponsiveSummaryText>
        </View>
        <TouchableOpacity
          testID={TEST_IDS.summaries.share}
          accessibilityRole="button"
          accessibilityLabel="요약 공유"
          onPress={handleSharePress}
          style={styles.navButton}
          activeOpacity={0.65}
        >
          <IconSymbol name="square.and.arrow.up" size={22} color={SummaryTheme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View
        key={`${width}-${height}-${fontScale}`}
        testID={TEST_IDS.summaries.detail(videoSummary.videoId)}
        style={styles.content}
      >
        <ScrollView
          testID={TEST_IDS.summaries.detailScroll}
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { width: contentWidth }]}
          showsVerticalScrollIndicator={false}
        >
        <TouchableOpacity
          style={styles.hero}
          onPress={handleOpenVideo}
          activeOpacity={0.86}
          accessibilityRole="link"
          accessibilityLabel={`${videoSummary.title} 유튜브에서 보기`}
        >
          <Image
            source={{ uri: cardData?.videoThumbnail }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroPlayButton}>
            <MaterialCommunityIcons name="play" size={28} color={SummaryTheme.colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.videoInfo}>
          <ResponsiveSummaryText baseSize={23} style={styles.videoTitle}>{videoSummary.title}</ResponsiveSummaryText>
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: cardData?.channelThumbnail || `https://via.placeholder.com/60/4285f4/ffffff?text=C` }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
            <View style={styles.channelInfo}>
              <ResponsiveSummaryText baseSize={14} style={styles.channelName}>{cardData?.channelName || 'Unknown Channel'}</ResponsiveSummaryText>
              <ResponsiveSummaryText baseSize={12} style={styles.publishDate}>{formatDate(videoSummary.publishedAt)}</ResponsiveSummaryText>
            </View>
          </View>
        </View>

        {/* Summary Content */}
        <View style={styles.summarySection}>
          
          <View style={styles.summaryContent}>
            {videoSummary.summary ? 
              renderFormattedSummary(videoSummary.summary) : 
              <ResponsiveSummaryText baseSize={16} style={styles.summaryText}>요약이 아직 생성되지 않았습니다.</ResponsiveSummaryText>
            }
          </View>

        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SummaryTheme.colors.background,
  },
  detailNav: {
    minHeight: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SummaryTheme.colors.background,
  },
  navButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleGroup: { flex: 1, alignItems: 'center' },
  navEyebrow: { color: SummaryTheme.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  navTitle: {
    marginTop: 2,
    color: SummaryTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  contentLabel: {
    color: SummaryTheme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginTop: 8,
    borderRadius: SummaryTheme.radius.card,
    backgroundColor: SummaryTheme.colors.textPrimary,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlayButton: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SummaryTheme.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -28 }, { translateY: -28 }],
  },
  videoInfo: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: SummaryTheme.colors.surface,
    borderRadius: SummaryTheme.radius.card,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
  },
  videoTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: SummaryTheme.colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  channelThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: SummaryTheme.colors.pending,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
    color: SummaryTheme.colors.textSecondary,
    marginBottom: 3,
  },
  publishDate: {
    fontSize: 12,
    color: SummaryTheme.colors.textMuted,
  },
  summarySection: {
    paddingTop: 12,
  },
  summaryContent: {
    marginBottom: 0,
  },
  overviewCard: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    marginBottom: 12,
    borderRadius: SummaryTheme.radius.card,
    backgroundColor: SummaryTheme.colors.accentSoft,
    borderColor: SummaryTheme.colors.border,
    borderBottomWidth: 1,
    borderWidth: 1,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  sectionAccent: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: SummaryTheme.colors.accent,
    marginRight: 8,
  },
  sectionEyebrow: {
    color: SummaryTheme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    paddingRight: 8,
  },
  overviewTitle: {
    color: SummaryTheme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 12,
  },
  detailsSection: {
    marginBottom: 0,
  },
  detailCard: {
    backgroundColor: SummaryTheme.colors.surface,
    borderColor: SummaryTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 10,
  },
  detailHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: SummaryTheme.colors.surface,
  },
  detailToggle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 38,
    minWidth: 0,
  },
  detailNumberBadge: {
    width: 34,
    minHeight: 24,
    flexShrink: 0,
    alignItems: 'flex-start',
    marginLeft: Platform.OS === 'ios' ? 1 : 0,
    marginRight: Platform.OS === 'ios' ? -5 : 0,
  },
  detailNumber: {
    width: 34,
    color: SummaryTheme.colors.accent,
    textAlign: 'left',
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  detailTitleContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    marginRight: 4,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
  },
  detailTitle: {
    color: SummaryTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  coreHeadingTitle: {
    color: SummaryTheme.colors.accent,
  },
  detailBody: {
    backgroundColor: SummaryTheme.colors.surface,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 4,
    paddingBottom: 0,
  },
  youtubeButton: {
    width: 30,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    marginTop: 0,
  },
  collapseButton: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  conclusionCard: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    marginTop: 2,
    marginBottom: 8,
    borderRadius: SummaryTheme.radius.card,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
    backgroundColor: SummaryTheme.colors.surface,
  },
  fallbackSection: {
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 16,
    color: SummaryTheme.colors.textSecondary,
    marginBottom: 8,
  },
  numberedItem: {
    marginBottom: 8,
    paddingLeft: 0,
  },
  numberedText: {
    fontSize: 16,
    color: SummaryTheme.colors.textSecondary,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 0,
  },
  bulletItemLast: {
    marginBottom: 0,
  },
  lastBulletBeforeNumber: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 15,
    color: SummaryTheme.colors.accent,
    marginRight: 6,
    fontWeight: '600',
  },
  bulletText: {
    fontSize: 15,
    color: SummaryTheme.colors.textSecondary,
  },
  bulletTextContainer: {
    flex: 1,
  },
  inlineBold: {
    color: SummaryTheme.colors.textPrimary,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: SummaryTheme.colors.textMuted,
  },
  retryButton: {
    backgroundColor: SummaryTheme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: SummaryTheme.colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});
