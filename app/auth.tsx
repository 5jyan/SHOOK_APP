import { KakaoSignInButton } from '@/components/KakaoSignInButton';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authLogger } from '../src/utils/logger-enhanced';

export default function AuthScreen() {
  const [showEmailLogin, setShowEmailLogin] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { login } = useAuthStore();

  const handleSuccess = () => {
    router.replace('/');
  };

  const handleError = (error: string) => {
    authLogger.error('Authentication error occurred', { error });
  };

  const handleEmailLogin = async () => {
    if (!username || !password) {
      Alert.alert('입력 오류', 'ID와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiService.loginWithEmail(username, password);
      login(user);
      router.replace('/');
    } catch (error) {
      Alert.alert(
        '로그인 실패',
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
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
            {!showEmailLogin ? (
              <>
                <KakaoSignInButton
                  onSuccess={handleSuccess}
                  onError={handleError}
                />

                <Pressable
                  style={styles.emailLoginButton}
                  onPress={() => setShowEmailLogin(true)}
                >
                  <Text style={styles.emailLoginButtonText}>
                    ID/PW로 로그인
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.emailForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="ID"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                  />
                  <Pressable
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleEmailLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.loginButtonText}>로그인</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.backButton}
                    onPress={() => setShowEmailLogin(false)}
                  >
                    <Text style={styles.backButtonText}>뒤로 가기</Text>
                  </Pressable>
                </View>
              </>
            )}

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
  emailLoginButton: {
    width: '100%',
    height: 48, // 카카오 버튼과 동일한 높이
    backgroundColor: '#ffffff',
    borderRadius: 12, // 카카오 버튼과 동일한 radius
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emailLoginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  emailForm: {
    gap: 12,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  loginButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#6b7280',
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
