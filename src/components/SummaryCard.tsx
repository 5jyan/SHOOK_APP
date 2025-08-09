import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';

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
}

interface SummaryCardProps {
  summary: SummaryData;
  onPress: () => void;
}

export function SummaryCard({ summary, onPress }: SummaryCardProps) {
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
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: summary.videoThumbnail }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{summary.duration}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Channel Info */}
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: summary.channelThumbnail }}
              style={styles.channelThumbnail}
              resizeMode="cover"
            />
            <Text style={styles.channelName} numberOfLines={1}>
              {summary.channelName}
            </Text>
            <Text style={styles.timeAgo}>
              {formatTimeAgo(summary.createdAt)}
            </Text>
          </View>

          {/* Video Title */}
          <Text style={styles.videoTitle} numberOfLines={2}>
            {summary.videoTitle}
          </Text>

          {/* Summary Preview */}
          <Text style={styles.summaryPreview} numberOfLines={3}>
            {summary.summary}
          </Text>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>AI 요약</Text>
            </View>
            <Text style={styles.readMore}>자세히 보기 →</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    padding: 16,
  },
  thumbnailContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelThumbnail: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  channelName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9ca3af',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 12,
  },
  summaryPreview: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285f4',
  },
});