import { KakaoSignInButton } from '@/components/KakaoSignInButton';
import { authLogger } from '../src/utils/logger-enhanced';
import { router } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const handleSuccess = () => {
    router.replace('/');
  };

  const handleError = (error: string) => {
    authLogger.error('Authentication error occurred', { error });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('../assets/images/Shook.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Shook</Text>
            <Text style={styles.subtitle}>
              YouTube 채널을 모니터링하고{'\n'}새 영상을 알림으로 받아보세요
            </Text>
          </View>

          <View style={styles.authSection}>
            <KakaoSignInButton
              onSuccess={handleSuccess}
              onError={handleError}
            />

            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                로그인하면 다음 약관에 동의한 것으로 간주됩니다
              </Text>
              <View style={styles.termsLinks}>
                <Pressable onPress={() => router.push('/terms-of-service')}>
                  <Text style={styles.linkText}>이용약관</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/privacy-policy')}>
                  <Text style={styles.linkText}>개인정보처리방침</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              카카오 로그인으로{'\n'}계정을 생성하거나 기존 계정에 로그인하세요
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  authSection: {
    gap: 24,
  },
  termsSection: {
    gap: 8,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  termsLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 48,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
  },
});
