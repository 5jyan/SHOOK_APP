import { apiService } from '@/services/api';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authLogger } from '../src/utils/logger-enhanced';

export default function SignupScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignup = async () => {
    // 입력 검증
    if (!username || !password || !passwordConfirm) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (username.length < 4) {
      Alert.alert('입력 오류', 'ID는 4자 이상이어야 합니다.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      authLogger.info('Starting signup process', { username });
      const user = await apiService.signup(username, password);
      authLogger.info('Signup successful', { userId: user.id });

      // 회원가입 성공 시 로그인 화면으로 돌아가기
      Alert.alert(
        '회원가입 완료',
        '회원가입이 완료되었습니다. 로그인해주세요.',
        [
          {
            text: '확인',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      authLogger.error('Signup failed', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert(
        '회원가입 실패',
        error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '회원가입' }} />
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
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>
              새 계정을 만들어 Shook을 시작하세요
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="ID (4자 이상)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
                editable={!isLoading}
              />
              <TextInput
                style={styles.input}
                placeholder="비밀번호 (8자 이상)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                editable={!isLoading}
              />
              <TextInput
                style={styles.input}
                placeholder="비밀번호 확인"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
                autoComplete="password-new"
                editable={!isLoading}
              />

              <Pressable
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.signupButtonText}>회원가입</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>로그인으로 돌아가기</Text>
              </Pressable>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                회원가입하면 다음 약관에 동의한 것으로 간주됩니다
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
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
  formSection: {
    gap: 24,
  },
  form: {
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
  signupButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
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
});
