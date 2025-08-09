import React from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { cn } from '@/lib/utils';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  className,
}: GoogleSignInButtonProps) {
  const { signIn, isLoading, error } = useGoogleAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
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
    <View className={cn("w-full", className)}>
      <Button
        variant="outline"
        size="lg"
        onPress={handleSignIn}
        loading={isLoading}
        disabled={isLoading}
        className="w-full bg-white border-gray-300 shadow-sm"
      >
        <View className="flex-row items-center justify-center space-x-3">
          {!isLoading && (
            <Image
              source={{
                uri: 'https://developers.google.com/identity/images/g-logo.png',
              }}
              className="w-5 h-5"
              resizeMode="contain"
            />
          )}
          <Text className="text-gray-700 font-medium text-base ml-3">
            {isLoading ? '로그인 중...' : 'Google로 계속하기'}
          </Text>
        </View>
      </Button>
      
      {error && (
        <Text className="text-destructive text-sm mt-2 text-center">
          {error}
        </Text>
      )}
    </View>
  );
}