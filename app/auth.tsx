import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function AuthScreen() {
  const handlePress = () => {
    // Redirect to the real auth screen
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

        <Pressable style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>카카오로 계속하기</Text>
        </Pressable>

        <View style={styles.termsContainer}>
          <Text style={styles.terms}>
            로그인하면{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => router.push('/terms-of-service')}
            >
              이용약관
            </Text>
            과{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => router.push('/privacy-policy')}
            >
              개인정보처리방침
            </Text>
            에 동의한 것으로 간주됩니다
          </Text>
        </View>
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
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
  },
  terms: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 12,
    color: '#3b82f6',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});