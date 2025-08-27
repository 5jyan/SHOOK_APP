import { useKakaoAuth } from '@/hooks/useKakaoAuth';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
      console.log('🟡 Kakao sign-in button pressed');
      await signIn();
      console.log('✅ Sign-in completed successfully');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';
      console.error('❌ Sign-in failed:', errorMessage);
      onError?.(errorMessage);
      Alert.alert('로그인 오류', errorMessage);
    }
  };

  // Show error if there is one
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
            <Image
              source={{
                uri: 'https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png',
              }}
              style={styles.kakaoIcon}
              resizeMode="contain"
            />
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
    backgroundColor: '#FEE500', // 카카오 브랜드 색상
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
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
    marginRight: 12,
  },
  buttonText: {
    color: '#3C1E1E', // 카카오 텍스트 색상
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});