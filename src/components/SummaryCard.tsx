import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { TEST_IDS } from '@/constants/test-ids';

interface SummaryData {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  channelThumbnail: string;
  videoThumbnail: string;
  summary: string;
  createdAt: string;
  publishedAt: string;
  duration: string;
  isSummarized: boolean;
}

interface SummaryCardProps {
  summary: SummaryData;
  onPress: () => void;
}

export function SummaryCard({ summary, onPress }: SummaryCardProps) {
  const isPending = !summary.isSummarized;
  const { fontScale } = useWindowDimensions();
  const thumbnailSize = { width: 160, height: 90 };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return '어제';
      } else if (diffInDays < 7) {
        return `${diffInDays}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        });
      }
    }
  };

  return (
    <Pressable 
      testID={TEST_IDS.summaries.row(summary.videoId)}
      accessibilityRole="button"
      accessibilityLabel={`${summary.videoTitle} 요약 열기`}
      style={({ pressed }) => [
        styles.listItem,
        isPending && styles.listItemPending,
        pressed && styles.listItemPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.listContent}>
        {/* Video Thumbnail */}
        <View style={[styles.thumbnailContainer, thumbnailSize]}>
          <Image 
            source={{ uri: summary.videoThumbnail }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          {/* Video Title */}
          <Text
            style={styles.videoTitle}
            numberOfLines={fontScale > 1.2 ? 3 : 2}
            maxFontSizeMultiplier={1}
          >
            {summary.videoTitle}
          </Text>
          {/* Channel and time metadata */}
          <View style={styles.metadataRow}>
            <Image 
              source={{ uri: summary.channelThumbnail }}
              style={styles.channelAvatar}
              resizeMode="cover"
            />
            
            <Text style={styles.metadataText} numberOfLines={1} maxFontSizeMultiplier={1}>
              {summary.channelName.trim()} · {formatTimeAgo(summary.publishedAt)}
            </Text>
          </View>
          
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listItemPending: {
    opacity: 0.5,
  },
  listItemPressed: {
    backgroundColor: '#f9fafb',
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  videoThumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  textContent: {
    flex: 1,
    paddingTop: 2,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#0f0f0f',
    lineHeight: 17,
    marginBottom: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  metadataText: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '400',
    flex: 1,
  },
});
