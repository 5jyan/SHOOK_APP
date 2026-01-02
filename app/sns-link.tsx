import { ModalHeader } from '@/components/AppHeader';
import { queryClient } from '@/lib/query-client';
import { apiService } from '@/services/api';
import { channelCacheService } from '@/services/channel-cache';
import { kakaoAuthService } from '@/services/kakao-auth';
import { videoCacheService } from '@/services/video-cache';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';
import { Asset } from 'expo-asset';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';

export default function SnsLinkScreen() {
  const { user, login } = useAuthStore();
  const [isLinkingKakao, setIsLinkingKakao] = React.useState(false);
  const [svgUri, setSvgUri] = React.useState<string | null>(null);
  const isKakaoLinked = !!user && user.isGuest === false;

  React.useEffect(() => {
    let isMounted = true;

    const loadSvg = async () => {
      try {
        const asset = Asset.fromModule(require('@/assets/images/kakao_account_integration.svg'));
        await asset.downloadAsync();
        if (isMounted) {
          setSvgUri(asset.localUri ?? asset.uri);
        }
      } catch (error) {
        uiLogger.error('[SnsLinkScreen] Failed to load Kakao SVG', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    loadSvg();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLinkKakaoAccount = () => {
    Alert.alert(
      '카카오 계정 연동',
      '카카오 계정을 연동하면 기기 변경이나 앱 재설치 후에도 데이터를 유지할 수 있습니다.\n\n연동을 진행하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연동하기',
          onPress: async () => {
            try {
              setIsLinkingKakao(true);
              uiLogger.info('[SnsLinkScreen] Starting Kakao link');

              const kakaoResult = await kakaoAuthService.signIn();
              const backendUser = await apiService.verifyKakaoToken(
                kakaoResult.accessToken,
                true
              );

              login({
                id: backendUser.id.toString(),
                username: backendUser.username || backendUser.name || kakaoResult.user.name,
                email: backendUser.email || kakaoResult.user.email || undefined,
                role: backendUser.role,
                isGuest: backendUser.isGuest,
                picture: kakaoResult.user.profileImage || undefined,
              });

              await channelCacheService.clearCache();
              await channelCacheService.forceSync();
              await videoCacheService.clearCache();
              await videoCacheService.signalChannelListChanged();
              queryClient.removeQueries({ queryKey: ['videoSummariesCached'] });
              queryClient.invalidateQueries({ queryKey: ['videoSummariesCached'] });

              Alert.alert(
                '연동 완료',
                '카카오 계정으로 연동되었습니다!',
                [{ text: '확인' }]
              );
            } catch (error) {
              uiLogger.error('[SnsLinkScreen] Kakao link failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              Alert.alert(
                '연동 실패',
                '계정 연동 중 오류가 발생했습니다.\n다시 시도해주세요.'
              );
            } finally {
              setIsLinkingKakao(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="SNS 계정 연동" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카카오 계정 연동</Text>
          <Text style={styles.sectionDescription}>
            카카오 계정으로 연동하면 Shook 계정을 안전하게 유지할 수 있습니다.
          </Text>
          <View style={styles.benefitList}>
            <Text style={styles.benefitItem}>- 구독 채널과 요약 기록 유지</Text>
            <Text style={styles.benefitItem}>- 기기 변경/재설치 시에도 동일 계정 유지</Text>
          </View>
          <Text style={styles.sectionNote}>
            연동 시 기존 데이터는 그대로 유지됩니다.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>연동 진행</Text>
          <Text style={styles.actionDescription}>
            카카오 계정을 연동해 두면 다음 로그인부터 더 간편하게 이용할 수 있습니다.
          </Text>
          {isKakaoLinked ? (
            <View style={styles.linkedNotice}>
              <Text style={styles.linkedTitle}>이미 연동이 완료되었습니다</Text>
              <Text style={styles.linkedDescription}>
                현재 계정은 카카오 계정과 연결되어 있습니다.
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={handleLinkKakaoAccount}
                disabled={isLinkingKakao}
                style={({ pressed }) => [
                  styles.kakaoButton,
                  isLinkingKakao && styles.kakaoButtonDisabled,
                  pressed && !isLinkingKakao && styles.kakaoButtonPressed
                ]}
              >
                {isLinkingKakao ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <>
                    {svgUri ? (
                      <SvgUri uri={svgUri} width="100%" height={48} />
                    ) : (
                      <ActivityIndicator color="#000000" />
                    )}
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  benefitList: {
    marginTop: 12,
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  sectionNote: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  actionSection: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  kakaoButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  kakaoButtonDisabled: {
    opacity: 0.6,
  },
  linkedNotice: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linkedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  linkedDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
