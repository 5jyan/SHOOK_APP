import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { uiLogger } from '@/utils/logger-enhanced';
import { useKakaoAuth } from '@/hooks/useKakaoAuth';

interface KakaoSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function KakaoSignInButton({
  onSuccess,
  onError,
}: KakaoSignInButtonProps) {
  const { signIn, isLoading, error } = useKakaoAuth();

  const handleSignIn = async () => {
    try {
      uiLogger.info('Kakao sign-in button pressed');
      await signIn();
      uiLogger.info('Kakao sign-in completed successfully');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';
      uiLogger.error('Kakao sign-in failed', { error: errorMessage });
      onError?.(errorMessage);
      Alert.alert('로그인 오류', errorMessage);
    }
  };

  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleSignIn}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.button,
          isLoading && styles.buttonDisabled,
          pressed && styles.buttonPressed
        ]}
      >
        {isLoading ? (
          <Text style={styles.loadingText}>로그인 중...</Text>
        ) : (
          <Image
            source={require('@/assets/images/kakao_login_high_resolution.png')}
            style={styles.buttonImage}
            resizeMode="cover"
          />
        )}
      </Pressable>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 48, // 카카오 가이드: medium 버튼 높이
    borderRadius: 12, // 카카오 가이드: 12px
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonImage: {
    width: '100%',
    height: 48, // 명시적으로 높이 고정
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.85,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
