import { useGoogleAuth } from '@/hooks/useGoogleAuthTemp';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { signIn, isLoading, error } = useGoogleAuth();

  const handleSignIn = async () => {
    try {
      console.log('🔘 Google sign-in button pressed');
      await signIn();
      console.log('✅ Sign-in completed successfully');
      onSuccess?.();
      // Don't navigate here - let ProtectedRoute handle it automatically
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
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
                uri: 'https://developers.google.com/identity/images/g-logo.png',
              }}
              style={styles.googleIcon}
              resizeMode="contain"
            />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? '로그인 중...' : 'Google로 계속하기'}
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  buttonText: {
    color: '#374151',
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