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
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        <View style={styles.buttonContent}>
          {!isLoading && (
            <View style={styles.kakaoIcon}>
              <Text style={styles.kakaoIconText}>K</Text>
            </View>
          )}
          <Text style={styles.buttonText}>
            {isLoading ? '로그인 중...' : '카카오로 계속하기'}
          </Text>
        </View>
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
    backgroundColor: '#FEE500',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3C1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kakaoIconText: {
    color: '#FEE500',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#3C1E1E',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
