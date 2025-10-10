import { useChannels } from '@/contexts/ChannelsContext';
import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChannelFilterBarProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string | null) => void;
}

export function ChannelFilterBar({ selectedChannelId, onChannelSelect }: ChannelFilterBarProps) {
  const { channels } = useChannels();

  const handleChannelPress = (channelId: string) => {
    // 이미 선택된 채널을 다시 클릭하면 선택 해제 (전체 보기)
    if (selectedChannelId === channelId) {
      onChannelSelect(null);
    } else {
      onChannelSelect(channelId);
    }
  };

  if (channels.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 각 채널 버튼 */}
        {channels.map((channel) => {
          const isSelected = selectedChannelId === channel.youtubeChannel.channelId;

          return (
            <TouchableOpacity
              key={channel.youtubeChannel.channelId}
              style={[
                styles.channelButton,
                isSelected && styles.channelButtonSelected
              ]}
              onPress={() => handleChannelPress(channel.youtubeChannel.channelId)}
            >
              <View style={[styles.thumbnailContainer, isSelected && styles.thumbnailSelected]}>
                <Image
                  source={{ uri: channel.youtubeChannel.thumbnail }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              </View>
              <Text
                style={[
                  styles.channelName,
                  isSelected && styles.channelNameSelected
                ]}
                numberOfLines={1}
              >
                {channel.youtubeChannel.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  channelButton: {
    alignItems: 'center',
    marginRight: 4,
  },
  channelButtonSelected: {
    // Selected state handled by thumbnail border
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: '#4285f4',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  channelName: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    maxWidth: 60,
    textAlign: 'center',
  },
  channelNameSelected: {
    color: '#4285f4',
    fontWeight: '600',
  },
});
