import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YoutubeChannelSearch } from '@/components/YoutubeChannelSearch';
import { ChannelList } from '@/components/ChannelList';
import { useUserChannels } from '@/hooks/useUserChannels';

export default function ChannelsScreen() {
  const { refreshChannels, channelCount, isLoading } = useUserChannels();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshChannels();
    } finally {
      setRefreshing(false);
    }
  }, [refreshChannels]);

  const handleChannelAdded = React.useCallback(() => {
    // Refresh the channel list when a new channel is added
    refreshChannels();
  }, [refreshChannels]);

  const handleChannelDeleted = React.useCallback(() => {
    // Channel list is automatically updated by the hook
    // This callback is for any additional actions if needed
  }, []);

  console.log('📺 ChannelsScreen rendering with channelCount:', channelCount);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Fixed search header */}
        <View style={styles.searchSection}>
          <YoutubeChannelSearch
            onChannelAdded={handleChannelAdded}
            maxChannels={3}
            currentChannelCount={channelCount}
          />
        </View>

        {/* Scrollable channel list */}
        <View style={styles.listSection}>
          <ChannelList 
            onChannelDeleted={handleChannelDeleted} 
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 200, // Ensure minimum height for visibility
  },
  listSection: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});