import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KakaoSignInButton } from '@/components/KakaoSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function AuthScreen() {
  const handleSuccess = () => {
    console.log('🎉 Login success - redirecting to main app');
    // Navigation will be handled automatically by ProtectedRoute
  };

  const handleError = (error: string) => {
    console.error('🔴 Login error:', error);
    Alert.alert('로그인 오류', error);
  };

  const handleComplexAuth = () => {
    // Fallback to complex auth screen if needed
    router.replace('/auth-complex');
  };

  return (
    <SafeAreaView style={styles.container}>
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

        <View style={styles.buttonContainer}>
          <KakaoSignInButton 
            onSuccess={handleSuccess} 
            onError={handleError} 
          />
          <GoogleSignInButton 
            onSuccess={handleSuccess} 
            onError={handleError} 
          />
        </View>

        <Text style={styles.terms}>
          로그인하면 이용약관과 개인정보처리방침에 동의한 것으로 간주됩니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  terms: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});