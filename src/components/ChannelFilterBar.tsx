import { SummaryTheme } from '@/constants/SummaryTheme';
import { TEST_IDS } from '@/constants/test-ids';
import { useChannels } from '@/contexts/ChannelsContext';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface ChannelFilterBarProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string | null) => void;
}

export function ChannelFilterBar({ selectedChannelId, onChannelSelect }: ChannelFilterBarProps) {
  const { channels } = useChannels();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const channelRefs = React.useRef<Record<string, View | null>>({});

  React.useEffect(() => {
    if (!selectedChannelId || !channelRefs.current[selectedChannelId]) return;

    channelRefs.current[selectedChannelId]?.measureLayout(
      scrollViewRef.current as never,
      (x: number) => scrollViewRef.current?.scrollTo({ x: Math.max(0, x - 100), animated: true }),
      () => undefined,
    );
  }, [selectedChannelId]);

  if (channels.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {channels.map((channel) => {
          const channelId = channel.youtubeChannel.channelId;
          const isSelected = selectedChannelId === channelId;

          return (
            <View
              key={channelId}
              ref={(ref) => { channelRefs.current[channelId] = ref; }}
              collapsable={false}
            >
              <Pressable
                testID={TEST_IDS.summaries.channelFilter(channelId, isSelected)}
                accessibilityRole="button"
                accessibilityLabel={`${channel.youtubeChannel.title} 채널 요약 보기`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChannelSelect(isSelected ? null : channelId)}
                style={({ pressed }) => [styles.channelButton, pressed && styles.channelButtonPressed]}
              >
                <View style={[styles.thumbnailContainer, isSelected && styles.thumbnailSelected]}>
                  <Image
                    source={channel.youtubeChannel.thumbnail
                      ? { uri: channel.youtubeChannel.thumbnail }
                      : require('../../assets/images/icon.png')}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                </View>
                <Text
                  style={[styles.channelName, isSelected && styles.channelNameSelected]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {channel.youtubeChannel.title}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SummaryTheme.colors.pending,
    borderBottomWidth: 1,
    borderBottomColor: SummaryTheme.colors.border,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 12 },
  channelButton: { width: 66, minHeight: 82, alignItems: 'center', justifyContent: 'flex-start' },
  channelButtonPressed: { opacity: 0.72 },
  thumbnailContainer: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2,
    borderColor: 'transparent', padding: 2, overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: SummaryTheme.colors.accent,
    borderWidth: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.16)',
    shadowColor: SummaryTheme.colors.accent,
    shadowOpacity: 0.32,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  thumbnail: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: SummaryTheme.colors.pending },
  channelName: {
    marginTop: 5, maxWidth: 66, color: SummaryTheme.colors.textSecondary,
    fontSize: 11, fontWeight: '600', textAlign: 'center',
  },
  channelNameSelected: { color: SummaryTheme.colors.accent, fontWeight: '900' },
});
