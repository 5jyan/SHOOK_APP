import { ChannelList } from '@/components/ChannelList';
import { FirstChannelGuide } from '@/components/FirstChannelGuide';
import { TabHeader } from '@/components/AppHeader';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { TEST_IDS } from '@/constants/test-ids';
import { useChannels } from '@/contexts/ChannelsContext';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChannelsScreen() {
  const { channelCount, refreshChannels } = useChannels();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ showChannelAddedGuide?: string; addedChannelId?: string }>();
  const [refreshing, setRefreshing] = React.useState(false);
  const [guideVisible, setGuideVisible] = React.useState(false);
  const [addedChannelId, setAddedChannelId] = React.useState<string | null>(null);
  const tabBarHeight = useBottomTabOverflow();

  const showChannelAddedGuide = React.useCallback((channelId: string) => {
    setAddedChannelId(channelId);
    setGuideVisible(true);
  }, []);

  React.useEffect(() => {
    if (params.showChannelAddedGuide !== '1' || !params.addedChannelId) return;
    const channelId = params.addedChannelId;
    router.setParams({ showChannelAddedGuide: undefined, addedChannelId: undefined });
    showChannelAddedGuide(channelId);
  }, [params.addedChannelId, params.showChannelAddedGuide, showChannelAddedGuide]);

  const handleGuideConfirm = React.useCallback(() => {
    setGuideVisible(false);
    if (!addedChannelId) return;
    router.push({
      pathname: '/(tabs)/summaries',
      params: { channelId: addedChannelId, _t: Date.now().toString() },
    });
    setAddedChannelId(null);
  }, [addedChannelId]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await refreshChannels(); } finally { setRefreshing(false); }
  }, [refreshChannels]);

  const handleChannelDeleted = React.useCallback(() => {
    uiLogger.info('[ChannelsScreen] handleChannelDeleted called, refreshing channels');
    refreshChannels();
  }, [refreshChannels]);

  const handleAddChannelPress = React.useCallback(() => {
    if (user?.isGuest === true && user.role !== 'tester' && user.role !== 'manager' && channelCount >= 1) {
      Alert.alert(
        '계정 연동이 필요해요',
        '게스트 계정은 채널 1개까지 추가할 수 있어요. 계정을 연동하면 채널을 더 추가할 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '계정 연동', onPress: () => router.push('/sns-link') },
        ],
      );
      return;
    }

    router.push('/channel-search');
  }, [channelCount, user?.isGuest, user?.role]);

  return (
    <SafeAreaView testID={TEST_IDS.screens.channels} style={styles.container} edges={['top', 'left', 'right']}>
      <TabHeader
        title="관심 채널"
        titlePrefix={<Image source={require('../../assets/images/Shook.png')} style={styles.titleLogo} resizeMode="contain" />}
        rightComponent={
          <Pressable
            testID={TEST_IDS.channels.searchOpen}
            accessibilityRole="button"
            accessibilityLabel="새 채널 추가"
            onPress={handleAddChannelPress}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <MaterialCommunityIcons name="plus" size={20} color={SummaryTheme.colors.onAccent} />
            <Text allowFontScaling={false} style={styles.addButtonText}>채널 추가</Text>
          </Pressable>
        }
      />

      <ChannelList
        onChannelDeleted={handleChannelDeleted}
        onChannelAdded={showChannelAddedGuide}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[SummaryTheme.colors.accent]} tintColor={SummaryTheme.colors.accent} />}
        tabBarHeight={tabBarHeight}
      />
      <FirstChannelGuide visible={guideVisible} onConfirm={handleGuideConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SummaryTheme.colors.background },
  titleLogo: { width: 25, height: 25 },
  addButton: {
    minHeight: 44, paddingHorizontal: 15, borderRadius: 14, backgroundColor: SummaryTheme.colors.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addButtonPressed: { opacity: 0.78 },
  addButtonText: { color: SummaryTheme.colors.onAccent, fontSize: 14, lineHeight: 18, fontWeight: '800' },
});
