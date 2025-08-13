import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVideoSummaries } from '@/hooks/useVideoSummaries';
import { EmptyState } from '@/components/EmptyState';

export default function SummaryDetailScreen() {
  const params = useLocalSearchParams();
  const videoId = params.summaryId as string;
  
  const { data: videoSummaries = [], isLoading, error, refetch } = useVideoSummaries();
  
  // Find the specific video by ID
  const videoSummary = React.useMemo(() => {
    return videoSummaries.find(video => video.videoId === videoId);
  }, [videoSummaries, videoId]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285f4" />
          <Text style={styles.loadingText}>요약을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error || !videoSummary) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="요약을 찾을 수 없습니다"
          description="해당 영상의 요약이 존재하지 않거나 삭제되었습니다."
          icon="exclamationmark.triangle"
          action={
            <Pressable style={styles.retryButton} onPress={() => router.back()}>
              <Text style={styles.retryButtonText}>뒤로 가기</Text>
            </Pressable>
          }
        />
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
      
      await Share.share({
        message: `${videoSummary.title}\n\n${summary.substring(0, 200)}...\n\n영상 보기: ${youtubeUrl}`,
        title: videoSummary.title,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleOpenVideo = () => {
    const youtubeUrl = `https://youtube.com/watch?v=${videoSummary.videoId}`;
    Linking.openURL(youtubeUrl);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#374151" />
        </Pressable>
        
        <Text style={styles.headerTitle}>상세 내용</Text>
        
        <Pressable onPress={handleSharePress} style={styles.shareButton}>
          <IconSymbol name="square.and.arrow.up" size={24} color="#374151" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Thumbnail */}
        <Pressable onPress={handleOpenVideo} style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: `https://img.youtube.com/vi/${videoSummary.videoId}/maxresdefault.jpg` }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <IconSymbol name="play.fill" size={32} color="#ffffff" />
          </View>
        </Pressable>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{videoSummary.title}</Text>
          
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: `https://via.placeholder.com/60/4285f4/ffffff?text=CH` }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>채널 정보</Text>
              <Text style={styles.publishDate}>
                {formatDate(videoSummary.publishedAt)}
              </Text>
            </View>
          </View>

          <Pressable onPress={handleOpenVideo} style={styles.openVideoButton}>
            <IconSymbol name="play.rectangle.fill" size={20} color="#ffffff" />
            <Text style={styles.openVideoText}>YouTube에서 보기</Text>
          </Pressable>
        </View>

        {/* Summary Content */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <IconSymbol name="doc.text.fill" size={24} color="#2563eb" />
            <Text style={styles.sectionTitle}>AI 요약</Text>
            <View style={styles.aibadge}>
              <Text style={styles.aiBadgeText}>AI 생성</Text>
            </View>
          </View>
          
          <View style={styles.summaryContent}>
            <Text style={styles.summaryText}>
              {videoSummary.summary || '요약이 아직 생성되지 않았습니다.'}
            </Text>
          </View>

          <Text style={styles.disclaimer}>
            * 이 요약은 AI가 자동으로 생성한 것으로, 실제 영상 내용과 다를 수 있습니다.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 16,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  channelThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  publishDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  openVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  openVideoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    padding: 16,
    paddingTop: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  summaryContent: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
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