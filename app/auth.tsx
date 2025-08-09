import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function AuthScreen() {
  const handlePress = () => {
    Alert.alert('로그인', 'Google 로그인 기능을 구현 중입니다.', [
      { text: '확인', onPress: () => router.replace('/') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Shook</Text>
          <Text style={styles.subtitle}>
            YouTube 채널을 모니터링하고{'\n'}새 영상을 알림으로 받아보세요
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Google로 계속하기</Text>
        </Pressable>

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
  terms: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});