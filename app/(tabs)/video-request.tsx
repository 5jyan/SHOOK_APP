import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabHeader } from '@/components/AppHeader';
import { SummaryCard } from '@/components/SummaryCard';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { TEST_IDS } from '@/constants/test-ids';
import { transformVideoSummaryToCardData } from '@/hooks/useVideoSummariesCached';
import { useVideoRequests } from '@/hooks/useVideoRequests';

const YOUTUBE_URL_PATTERN = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//i;

export default function VideoRequestScreen() {
  const [url, setUrl] = React.useState('');
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const tabBarHeight = useBottomTabOverflow();
  const {
    data: videos = [],
    isLoading,
    isRefetching,
    error,
    refetch,
    requestSummary,
    isRequesting,
  } = useVideoRequests();

  const requestUrl = async (value: string) => {
    const trimmedUrl = value.trim();
    if (!YOUTUBE_URL_PATTERN.test(trimmedUrl)) {
      setInputError('YouTube 영상 링크를 확인해주세요.');
      setFeedback(null);
      return;
    }

    Keyboard.dismiss();
    setInputError(null);
    setFeedback(null);
    try {
      const video = await requestSummary(trimmedUrl);
      setUrl('');
      if (video.processingStatus === 'completed' && video.summary) {
        router.push({ pathname: '/summary-detail', params: { summaryId: video.videoId } });
        return;
      }
      setFeedback('요약을 시작했어요. 완료되면 아래에서 열 수 있어요.');
    } catch (requestError) {
      setInputError(requestError instanceof Error ? requestError.message : '잠시 후 다시 시도해주세요.');
    }
  };

  const handleSubmit = () => requestUrl(url);
  const handleRetry = (videoId: string) => requestUrl(`https://youtube.com/watch?v=${videoId}`);
  const handleVideoPress = (videoId: string, processingStatus?: string) => {
    if (processingStatus === 'failed') {
      void handleRetry(videoId);
      return;
    }
    if (processingStatus !== 'completed') {
      setFeedback('요약이 진행 중이에요. 완료되면 열어볼 수 있어요.');
      return;
    }
    router.push({ pathname: '/summary-detail', params: { summaryId: videoId } });
  };
  const completedCount = videos.filter((video) => video.processingStatus === 'completed' && video.summary).length;

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.introTitle} allowFontScaling={false}>유튜브 링크로 바로 요약</Text>
      <Text style={styles.introDescription} allowFontScaling={false}>
        보고 싶은 영상의 링크를 붙여 넣어주세요.
      </Text>

      <Text style={styles.inputLabel} allowFontScaling={false}>영상 링크</Text>
      <View style={[styles.inputSurface, inputError && styles.inputSurfaceError]}>
        <MaterialCommunityIcons name="youtube" size={22} color={SummaryTheme.colors.textMuted} />
        <TextInput
          testID={TEST_IDS.videoRequests.input}
          value={url}
          onChangeText={(value) => {
            setUrl(value);
            if (inputError) setInputError(null);
          }}
          placeholder="youtube.com/watch?v=..."
          placeholderTextColor={SummaryTheme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!isRequesting}
          style={styles.input}
        />
        {!!url && !isRequesting && (
          <Pressable accessibilityLabel="입력 지우기" onPress={() => setUrl('')} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={20} color={SummaryTheme.colors.textMuted} />
          </Pressable>
        )}
      </View>
      {inputError && <Text style={styles.inputError} allowFontScaling={false}>{inputError}</Text>}

      <Pressable
        testID={TEST_IDS.videoRequests.submit}
        accessibilityRole="button"
        accessibilityLabel="요약 시작"
        disabled={!url.trim() || isRequesting}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          (!url.trim() || isRequesting) && styles.submitButtonDisabled,
          pressed && styles.submitButtonPressed,
        ]}
      >
        {isRequesting
          ? <ActivityIndicator color={SummaryTheme.colors.onAccent} />
          : <MaterialCommunityIcons name="auto-fix" size={20} color={SummaryTheme.colors.onAccent} />}
        <Text style={styles.submitButtonText} allowFontScaling={false}>
          {isRequesting ? '영상 확인 중' : '요약 시작'}
        </Text>
      </Pressable>

      <Text style={styles.supportText} allowFontScaling={false}>자막이 있는 일반 영상을 지원해요</Text>

      {feedback && (
        <View style={styles.feedback}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={SummaryTheme.colors.textSecondary} />
          <Text style={styles.feedbackText} allowFontScaling={false}>{feedback}</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>최근 요청</Text>
        {videos.length > 0 && (
          <Text style={styles.sectionCount} allowFontScaling={false}>{completedCount}/{videos.length} 완료</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView testID={TEST_IDS.screens.videoRequest} style={styles.container} edges={['top', 'left', 'right']}>
      <TabHeader
        title="영상 요약"
        titlePrefix={<Image source={require('../../assets/images/Shook.png')} style={styles.titleLogo} resizeMode="contain" />}
      />
      <FlatList
        data={videos}
        keyExtractor={(item) => item.videoId}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            tintColor={SummaryTheme.colors.textSecondary}
          />
        )}
        ListEmptyComponent={isLoading ? (
          <ActivityIndicator style={styles.listState} color={SummaryTheme.colors.accent} />
        ) : error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={SummaryTheme.colors.textMuted} />
            <Text style={styles.emptyTitle} allowFontScaling={false}>목록을 불러오지 못했어요</Text>
            <Pressable onPress={() => refetch()}><Text style={styles.retryText}>다시 시도</Text></Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="movie-open-outline" size={30} color={SummaryTheme.colors.textMuted} />
            <Text style={styles.emptyTitle} allowFontScaling={false}>아직 요청한 영상이 없어요</Text>
            <Text style={styles.emptyDescription} allowFontScaling={false}>첫 번째 영상 링크를 넣어보세요.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SummaryCard
            summary={transformVideoSummaryToCardData(item)}
            pendingLabel={item.processingStatus === 'failed' ? '요약 실패 · 눌러서 재시도' : '요약 준비 중'}
            onPress={() => handleVideoPress(item.videoId, item.processingStatus)}
          />
        )}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SummaryTheme.colors.background },
  titleLogo: { width: 25, height: 25 },
  headerContent: { paddingHorizontal: 16, paddingTop: 12 },
  introTitle: { color: SummaryTheme.colors.textPrimary, fontSize: 21, lineHeight: 28, fontWeight: '800' },
  introDescription: { color: SummaryTheme.colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 22 },
  inputLabel: { color: SummaryTheme.colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputSurface: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SummaryTheme.colors.surface,
    borderWidth: 1,
    borderColor: SummaryTheme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputSurfaceError: { borderColor: '#C95F5F' },
  input: { flex: 1, color: SummaryTheme.colors.textPrimary, fontSize: 15, paddingVertical: 13 },
  inputError: { color: '#FF8585', fontSize: 12, lineHeight: 17, marginTop: 7 },
  submitButton: {
    minHeight: 52,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: SummaryTheme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.35 },
  submitButtonPressed: { opacity: 0.78 },
  submitButtonText: { color: SummaryTheme.colors.onAccent, fontSize: 15, fontWeight: '800' },
  supportText: { color: SummaryTheme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 9 },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SummaryTheme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 14,
  },
  feedbackText: { flex: 1, color: SummaryTheme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 10 },
  sectionTitle: { color: SummaryTheme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  sectionCount: { color: SummaryTheme.colors.textMuted, fontSize: 12 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28 },
  emptyTitle: { color: SummaryTheme.colors.textSecondary, fontSize: 14, fontWeight: '700', marginTop: 10 },
  emptyDescription: { color: SummaryTheme.colors.textMuted, fontSize: 12, marginTop: 5 },
  listState: { marginTop: 28 },
  retryText: { color: SummaryTheme.colors.textPrimary, fontSize: 13, fontWeight: '700', padding: 12 },
});
