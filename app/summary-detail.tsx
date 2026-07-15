import { ModalHeader } from '@/components/AppHeader';
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
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiLogger } from '../src/utils/logger-enhanced';

export default function SummaryDetailScreen() {
  const { width } = useWindowDimensions();
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

  const renderBullets = (items: string[], keyPrefix: string) => items.map((item, index) => (
    <View key={`${keyPrefix}-${index}`} style={styles.bulletItem}>
      <Text style={styles.bulletPoint}>•</Text>
      <Text style={styles.bulletText}>{renderInlineBold(item)}</Text>
    </View>
  ));

  const renderInlineBold = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    text.split(/(\*\*[^*]+\*\*)/g).forEach((part, index) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      if (!isBold) {
        nodes.push(part);
        return;
      }

      // iOS can reserve a wrapped line but clip the remainder of one long
      // nested bold span. Separate words keep every whitespace wrap point usable.
      part.slice(2, -2).split(/(\s+)/).forEach((token, tokenIndex) => {
        nodes.push(
          <Text key={`bold-${index}-${tokenIndex}`} style={styles.inlineBold}>
            {token}
          </Text>,
        );
      });
    });

    return nodes;
  };

  const renderFormattedSummary = (summary: string) => {
    const parsed = parseSummary(summary);
    const hasStructuredContent = parsed.overview.length > 0 || parsed.sections.length > 0;

    if (!hasStructuredContent) {
      return renderBullets(parsed.fallback, 'fallback');
    }

    return (
      <>
        {parsed.overview.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.sectionEyebrowRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionEyebrow}>SUMMARY</Text>
            </View>
            <Text style={styles.overviewTitle}>한눈에 보기</Text>
            {renderBullets(parsed.overview, 'overview')}
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
                          <Text style={styles.detailNumber}>{String(displayNumber).padStart(2, '0')}</Text>
                        </View>
                      )}
                      <Text style={[styles.detailTitle, isCoreHeading && styles.coreHeadingTitle]}>
                        {section.title}
                      </Text>
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
                  {expanded && (
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
            <Text style={styles.summarySectionTitle}>결론</Text>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ModalHeader 
        title="상세 내용"
        rightComponent={
          <TouchableOpacity onPress={handleSharePress} style={styles.shareButton}>
            <IconSymbol name="square.and.arrow.up" size={24} color="#374151" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { width: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.hero} onPress={handleOpenVideo} activeOpacity={0.9}>
          <Image
            source={{ uri: cardData?.videoThumbnail }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroScrim} />
          <View style={styles.heroPlayButton}>
            <IconSymbol name="play.rectangle.fill" size={25} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{videoSummary.title}</Text>
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: cardData?.channelThumbnail || `https://via.placeholder.com/60/4285f4/ffffff?text=C` }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{cardData?.channelName || 'Unknown Channel'}</Text>
              <Text style={styles.publishDate}>{formatDate(videoSummary.publishedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Summary Content */}
        <View style={styles.summarySection}>
          
          <View style={styles.summaryContent}>
            {videoSummary.summary ? 
              renderFormattedSummary(videoSummary.summary) : 
              <Text style={styles.summaryText}>요약이 아직 생성되지 않았습니다.</Text>
            }
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  shareButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignSelf: 'center',
    paddingBottom: 8,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  heroPlayButton: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -28 }, { translateY: -28 }],
  },
  videoInfo: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  videoTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 32,
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
    backgroundColor: '#f1f5f9',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  publishDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  summarySection: {
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  summaryContent: {
    marginBottom: 0,
  },
  overviewCard: {
    paddingBottom: 18,
    marginBottom: 12,
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
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
    backgroundColor: '#60a5fa',
    marginRight: 8,
  },
  sectionEyebrow: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  overviewTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailsSection: {
    marginBottom: 0,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 8,
  },
  detailHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: '#ffffff',
  },
  detailToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
  },
  detailNumberBadge: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  detailNumber: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  detailTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    marginRight: 4,
  },
  coreHeadingTitle: {
    color: '#2563eb',
  },
  detailBody: {
    backgroundColor: '#ffffff',
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 4,
    paddingBottom: 0,
  },
  youtubeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  collapseButton: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conclusionCard: {
    paddingTop: 8,
    marginBottom: 8,
  },
  fallbackSection: {
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  numberedItem: {
    marginBottom: 8,
    paddingLeft: 0,
  },
  numberedText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontWeight: 'bold',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 0,
  },
  lastBulletBeforeNumber: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#3b82f6',
    marginRight: 6,
    fontWeight: '600',
  },
  bulletText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 23,
    flex: 1,
    paddingRight: 2,
  },
  inlineBold: {
    color: '#1e293b',
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
