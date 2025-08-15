import { ChannelList } from '@/components/ChannelList';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChannels } from '@/contexts/ChannelsContext';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const handleChannelDeleted = React.useCallback(() => {
    // Refresh channels to update the count immediately
    console.log('🗑️ [ChannelsScreen] handleChannelDeleted called, refreshing channels...');
    refreshChannels();
  }, [refreshChannels]);

  const handleSearchPress = () => {
    router.push('/channel-search');
  };

  console.log('📺 [ChannelsScreen] rendering with channelCount:', channelCount);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 채널</Text>
        <TouchableOpacity onPress={handleSearchPress} style={styles.searchButton}>
          <IconSymbol name="magnifyingglass" size={24} color="#374151" />
        </TouchableOpacity>
      </View>
      {/* Channel List */}
      <ChannelList 
        onChannelDeleted={handleChannelDeleted} 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
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
  searchButton: {
    borderRadius: 8,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
});
