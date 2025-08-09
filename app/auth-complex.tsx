import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function AuthScreen() {
  const handleSuccess = () => {
    router.replace('/');
  };

  const handleError = (error: string) => {
    console.error('Auth Error:', error);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="mb-12 text-center">
            <Text className="text-4xl font-bold text-foreground mb-3 text-center">Shook</Text>
            <Text className="text-lg text-muted-foreground text-center leading-6">
              YouTube 채널을 모니터링하고{'\n'}새 영상을 알림으로 받아보세요
            </Text>
          </View>

          <View className="space-y-6">
            <GoogleSignInButton
              onSuccess={handleSuccess}
              onError={handleError}
            />

            <View className="space-y-2">
              <Text className="text-center text-sm text-muted-foreground">
                로그인하면 다음 약관에 동의한 것으로 간주됩니다
              </Text>
              <View className="flex-row justify-center space-x-4">
                <Text className="text-sm text-primary underline">이용약관</Text>
                <Text className="text-sm text-primary underline">개인정보처리방침</Text>
              </View>
            </View>
          </View>

          <View className="mt-12">
            <Text className="text-center text-xs text-muted-foreground">
              안전하고 간편한 Google 로그인으로{'\n'}계정을 생성하거나 기존 계정에 로그인하세요
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}