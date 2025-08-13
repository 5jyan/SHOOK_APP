import React from 'react';
import { View, StyleSheet, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YoutubeChannelSearch } from '@/components/YoutubeChannelSearch';
import { ChannelList } from '@/components/ChannelList';
import { useChannels } from '@/contexts/ChannelsContext';

export default function ChannelsScreen() {
  const { refreshChannels, channelCount, isLoading } = useChannels();
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
    console.log('🔄 [ChannelsScreen] handleChannelAdded called, refreshing channels...');
    refreshChannels();
  }, [refreshChannels]);

  const handleChannelDeleted = React.useCallback(() => {
    // Refresh channels to update the count immediately
    console.log('🗑️ [ChannelsScreen] handleChannelDeleted called, refreshing channels...');
    refreshChannels();
  }, [refreshChannels]);

  console.log('📺 [ChannelsScreen] rendering with channelCount:', channelCount);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>채널</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        {/* Fixed search header */}
        <View style={styles.searchSection}>
          <View style={styles.searchWrapper}>
            <YoutubeChannelSearch
              onChannelAdded={handleChannelAdded}
              maxChannels={3}
              currentChannelCount={channelCount}
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    minHeight: 200, // Ensure minimum height for visibility
  },
  searchWrapper: {
    backgroundColor: '#f9fafb', // Subtle different background to separate from header
  },
  listSection: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
