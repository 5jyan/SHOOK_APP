import { ModalHeader } from '@/components/AppHeader';
import { ShookLoadingScreen } from '@/components/ShookLoadingScreen';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUserChannelsCached } from '@/hooks/useUserChannelsCached';
import { useVideoSummaryDetail } from '@/hooks/useVideoSummaryDetail';
import { transformVideoSummaryToCardData } from '@/hooks/useVideoSummariesCached';
import { getVideoSummariesQueryKey, type CacheAwareData, videoSummariesSyncService } from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { parseSummary } from '@/utils/summary-parser';
import { useQueryClient } from '@tanstack/react-query';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { uiLogger } from '../src/utils/logger-enhanced';

export default function SummaryDetailScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 752);
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
    const youtubeUrl = `https://youtube.com/watch?v=${videoSummary.videoId}&t=${timestampSeconds}s`;
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
      <Text style={styles.bulletText}>{item}</Text>
    </View>
  ));

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
            {parsed.overview.map((item, index) => (
              <View key={`overview-${index}`} style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.overviewText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {parsed.keyFacts.length > 0 && (
          <View style={styles.keyFactsSection}>
            <Text style={styles.summarySectionTitle}>주요 숫자</Text>
            <View style={styles.keyFactsWrap}>
              {parsed.keyFacts.map((fact, index) => (
                <View key={`fact-${index}`} style={styles.keyFactChip}>
                  <Text style={styles.keyFactText}>{fact}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {parsed.sections.length > 0 && (
          <View style={styles.detailsSection}>
            <View style={styles.detailsHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>DETAILS</Text>
                <Text style={styles.detailsTitle}>핵심 내용</Text>
              </View>
              <Text style={styles.detailsCount}>{parsed.sections.length}개 주제</Text>
            </View>
            {parsed.sections.map((section, index) => {
              const expanded = !collapsedSections.has(index);
              return (
                <View key={`section-${index}`} style={styles.detailCard}>
                  <TouchableOpacity
                    style={styles.detailHeader}
                    onPress={() => toggleSection(index)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${section.title} ${expanded ? '접기' : '펼치기'}`}
                  >
                    <View style={styles.detailNumberBadge}>
                      <Text style={styles.detailNumber}>{String(index + 1).padStart(2, '0')}</Text>
                    </View>
                    <Text style={styles.detailTitle}>{section.title}</Text>
                    <IconSymbol
                      name={expanded ? 'chevron.up' : 'chevron.down'}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {expanded && (
                    <View style={styles.detailBody}>
                      {renderBullets(section.bullets, `section-${index}`)}
                      {section.timestampSeconds !== undefined && (
                        <TouchableOpacity
                          style={styles.timestampButton}
                          onPress={() => handleOpenVideoAt(section.timestampSeconds!)}
                          activeOpacity={0.7}
                          accessibilityRole="link"
                          accessibilityLabel={`${section.title} 영상에서 보기`}
                        >
                          <IconSymbol name="play.rectangle.fill" size={17} color="#2563eb" />
                          <Text style={styles.timestampButtonText}>영상에서 보기</Text>
                        </TouchableOpacity>
                      )}
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Text style={styles.heroAction}>YouTube에서 보기</Text>
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
    paddingBottom: 40,
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
    left: 20,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAction: {
    position: 'absolute',
    left: 80,
    bottom: 31,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  videoInfo: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  videoTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 32,
    letterSpacing: -0.4,
    marginBottom: 18,
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
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  summaryContent: {
    marginBottom: 12,
  },
  overviewCard: {
    paddingBottom: 18,
    marginBottom: 32,
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
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
  },
  overviewNumber: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 23,
    marginRight: 14,
  },
  overviewText: {
    flex: 1,
    color: '#334155',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 25,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  keyFactsSection: {
    marginBottom: 20,
  },
  keyFactsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyFactChip: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginRight: 14,
  },
  keyFactText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  detailsTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  detailsCount: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingBottom: 18,
    marginBottom: 22,
  },
  detailHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  detailNumberBadge: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailNumber: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  detailTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    marginRight: 8,
  },
  detailBody: {
    backgroundColor: '#ffffff',
    paddingLeft: 38,
    paddingRight: 4,
    paddingTop: 10,
    paddingBottom: 0,
  },
  timestampButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 16,
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  timestampButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  conclusionCard: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    paddingTop: 24,
    marginBottom: 24,
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
    marginRight: 10,
    fontWeight: '600',
  },
  bulletText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 23,
    flex: 1,
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
