import { EmptyState } from '@/components/EmptyState';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUserChannels } from '@/hooks/useUserChannels';
import { useVideoSummaries } from '@/hooks/useVideoSummaries';
import { transformVideoSummaryToCardData } from '@/hooks/useVideoSummariesCached';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SummaryDetailScreen() {
  const params = useLocalSearchParams();
  const videoId = params.summaryId as string;
  
  const { data: videoSummaries = [], isLoading, error, refetch } = useVideoSummaries();
  const { channels } = useUserChannels();
  
  // Find the specific video by ID and transform it to get channel info
  const videoSummary = React.useMemo(() => {
    return videoSummaries.find(video => video.videoId === videoId);
  }, [videoSummaries, videoId]);
  
  // Transform to get channel information using cached data (includes real thumbnails)
  const cardData = React.useMemo(() => {
    if (!videoSummary) return null;
    return transformVideoSummaryToCardData(videoSummary, channels, videoSummary.channelTitle);
  }, [videoSummary, channels]);
  
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

  const renderFormattedSummary = (summary: string) => {
    const lines = summary.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      const nextLine = lines[index + 1]?.trim();
      const isLastBulletBeforeNumber = /^[-*•]/.test(trimmedLine) && nextLine && /^\d+\./.test(nextLine);
      
      // 번호 목록 (1., 2., 3. 등)
      if (/^\d+\./.test(trimmedLine)) {
        return (
          <View key={index} style={styles.numberedItem}>
            <Text style={styles.numberedText}>{trimmedLine}</Text>
          </View>
        );
      }
      
      // 불렛 포인트 (-, *, • 등)
      if (/^[-*•]/.test(trimmedLine)) {
        return (
          <View key={index} style={[
            styles.bulletItem,
            isLastBulletBeforeNumber && styles.lastBulletBeforeNumber
          ]}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{trimmedLine.substring(1).trim()}</Text>
          </View>
        );
      }
      
      // 일반 텍스트
      return (
        <Text key={index} style={styles.summaryText}>
          {trimmedLine}
        </Text>
      );
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
        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{videoSummary.title}</Text>
          <Text style={styles.publishDate}>
            {formatDate(videoSummary.publishedAt)}
          </Text>
          
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: cardData?.channelThumbnail || `https://via.placeholder.com/60/4285f4/ffffff?text=C` }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{cardData?.channelName || 'Unknown Channel'}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleOpenVideo} 
              style={styles.youtubeIconButton}
              activeOpacity={0.6}
            >
              <Image 
                source={require('../assets/images/youtube_icon.png')} 
                style={styles.youtubeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
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
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -6,
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
    marginBottom: 16,
  },
  youtubeIconButton: {
    padding: 8,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
  },
  youtubeIcon: {
    width: 32,
    height: 32,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
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
    marginBottom: 6,
    paddingLeft: 16,
  },
  lastBulletBeforeNumber: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
    fontWeight: '600',
  },
  bulletText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    flex: 1,
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