import { TabHeader } from '@/components/AppHeader';
import { ChannelList } from '@/components/ChannelList';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useChannels } from '@/contexts/ChannelsContext';
import { uiLogger } from '@/utils/logger-enhanced';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChannelsScreen() {
  const { refreshChannels, channelCount, isLoading } = useChannels();
  const [refreshing, setRefreshing] = React.useState(false);
  const tabBarHeight = useBottomTabOverflow();

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshChannels();
    } finally {
      setRefreshing(false);
    }
  }, [refreshChannels]);

  const handleChannelDeleted = React.useCallback(() => {
    // Refresh channels to update the count immediately
    uiLogger.info('[ChannelsScreen] handleChannelDeleted called, refreshing channels');
    refreshChannels();
  }, [refreshChannels]);

  const handleSearchPress = () => {
    router.push('/channel-search');
  };

  uiLogger.debug('[ChannelsScreen] rendering', { channelCount });

  return (
    <SafeAreaView style={styles.container}>
      <TabHeader
        title="나의 채널"
        rightComponent={
          <TouchableOpacity onPress={handleSearchPress} style={styles.addButton}>
            <IconSymbol name="plus.circle.fill" size={24} color="#374151" />
          </TouchableOpacity>
        }
      />
      {/* Channel List */}
      <ChannelList 
        onChannelDeleted={handleChannelDeleted} 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        tabBarHeight={tabBarHeight}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  addButton: {
    borderRadius: 8,
    marginRight: 4,
  },
});
