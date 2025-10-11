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
  const scrollViewRef = React.useRef<ScrollView>(null);
  const channelRefs = React.useRef<{ [key: string]: View | null }>({});

  const handleChannelPress = (channelId: string) => {
    // 이미 선택된 채널을 다시 클릭하면 선택 해제 (전체 보기)
    if (selectedChannelId === channelId) {
      onChannelSelect(null);
    } else {
      onChannelSelect(channelId);
    }
  };

  // 선택된 채널이 변경되면 자동으로 스크롤
  React.useEffect(() => {
    if (selectedChannelId && channelRefs.current[selectedChannelId]) {
      channelRefs.current[selectedChannelId]?.measureLayout(
        scrollViewRef.current as any,
        (x: number) => {
          // 선택된 채널을 화면 중앙에 위치시키기
          scrollViewRef.current?.scrollTo({
            x: x - 100, // 왼쪽 여백을 두고 스크롤
            animated: true,
          });
        },
        () => {}
      );
    }
  }, [selectedChannelId]);

  if (channels.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 각 채널 버튼 */}
        {channels.map((channel) => {
          const isSelected = selectedChannelId === channel.youtubeChannel.channelId;

          return (
            <View
              key={channel.youtubeChannel.channelId}
              ref={(ref) => {
                channelRefs.current[channel.youtubeChannel.channelId] = ref;
              }}
              collapsable={false}
            >
              <TouchableOpacity
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
            </View>
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
    width: 54,
    height: 54,
    borderRadius: 27,
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
    borderRadius: 25,
  },
  channelName: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
    maxWidth: 54,
    textAlign: 'center',
  },
  channelNameSelected: {
    color: '#4285f4',
    fontWeight: '600',
  },
});
