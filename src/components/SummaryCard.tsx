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
import { FontScaleLimit, SummaryTheme } from '@/constants/SummaryTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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
  pendingLabel?: string;
}

export function SummaryCard({ summary, onPress, pendingLabel = '요약 준비 중' }: SummaryCardProps) {
  const isPending = !summary.isSummarized;
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = Math.min(width, 752);
  const thumbnailWidth = Math.min(176, Math.max(136, contentWidth * 0.36));
  const thumbnailHeight = thumbnailWidth * 9 / 16;
  const effectiveFontScale = Math.min(fontScale, FontScaleLimit.content);
  const titleLineHeight = 20 * effectiveFontScale;
  const titleHeightBudget = thumbnailHeight
    - styles.textContent.paddingTop
    - styles.videoTitle.marginBottom
    - styles.channelAvatar.height;
  const titleLines = Math.max(1, Math.min(3, Math.floor(titleHeightBudget / titleLineHeight)));
  const thumbnailSize = { width: thumbnailWidth, height: thumbnailHeight };

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
      accessibilityLabel={`${summary.videoTitle}${isPending ? `, ${pendingLabel}` : ', 요약 열기'}`}
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
          {isPending && (
            <View
              testID={TEST_IDS.summaries.pendingIcon(summary.videoId)}
              style={styles.pendingThumbnailOverlay}
            >
              <View style={styles.pendingIconSurface}>
                <MaterialCommunityIcons name="timer-sand" size={22} color={SummaryTheme.colors.textPrimary} />
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          {/* Video Title */}
          <Text
            style={styles.videoTitle}
            numberOfLines={titleLines}
            allowFontScaling={false}
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
            
            <Text
              style={[styles.metadataText, isPending && styles.metadataTextPending]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {summary.channelName.trim()} · {isPending ? pendingLabel : formatTimeAgo(summary.publishedAt)}
            </Text>
          </View>
          
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listItem: {
    backgroundColor: SummaryTheme.colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listItemPending: {
    opacity: 0.5,
  },
  listItemPressed: {
    backgroundColor: SummaryTheme.colors.pressed,
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: SummaryTheme.colors.pending,
  },
  videoThumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  pendingThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 16, 19, 0.48)',
  },
  pendingIconSurface: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(23, 23, 28, 0.88)',
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
  },
  textContent: {
    flex: 1,
    paddingTop: 2,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: SummaryTheme.colors.textPrimary,
    lineHeight: 20,
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
    backgroundColor: SummaryTheme.colors.pending,
    marginRight: 6,
  },
  metadataText: {
    fontSize: 12,
    color: SummaryTheme.colors.textSecondary,
    fontWeight: '400',
    flex: 1,
  },
  metadataTextPending: {
    color: SummaryTheme.colors.textPrimary,
  },
});
