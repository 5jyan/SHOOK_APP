import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
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
        styles.listItem,
        pressed && styles.listItemPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.listContent}>
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: summary.videoThumbnail }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          {/* Video Title */}
          <Text style={styles.videoTitle} numberOfLines={2}>
            {summary.videoTitle}
          </Text>
                    {/* Time Info */}
          <Text style={styles.timeAgo}>
            {formatTimeAgo(summary.publishedAt)}
          </Text>

          {/* Channel Info with Avatar */}
          <View style={styles.channelRow}>
            <Image 
              source={{ uri: summary.channelThumbnail }}
              style={styles.channelAvatar}
              resizeMode="cover"
            />
            
            <Text style={styles.channelName} numberOfLines={1}>
              {summary.channelName}
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
    paddingHorizontal: 12,
  },
  listItemPressed: {
    backgroundColor: '#f9fafb',
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  videoThumbnail: {
    width: 160,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  textContent: {
    flex: 1,
    paddingTop: 2,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#0f0f0f',
    lineHeight: 20,
    marginBottom: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  channelAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  channelName: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '400',
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: '#606060',
    marginBottom: 6,
  },
});