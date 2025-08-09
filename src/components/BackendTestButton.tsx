import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { apiService } from '@/services/api';

export function BackendTestButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const testBackend = async () => {
    setTesting(true);
    setResult('Testing backend connectivity...');

    try {
      console.log('🧪 Testing backend connectivity...');
      const response = await apiService.getCurrentUser();
      
      if (response.success) {
        const message = `✅ Backend is running!\nAuth endpoint working\nResponse received`;
        setResult(message);
        console.log('✅ Backend test successful:', response.data);
      } else {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          const message = `✅ Backend is running!\nNot authenticated (expected)\nAuth endpoint working`;
          setResult(message);
        } else {
          const message = `❌ Backend test failed:\n${response.error}`;
          setResult(message);
          console.error('❌ Backend test failed:', response.error);
        }
      }
    } catch (error) {
      const message = `❌ Network error:\n${error instanceof Error ? error.message : 'Unknown error'}`;
      setResult(message);
      console.error('❌ Backend test error:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={testBackend}
        disabled={testing}
        style={[styles.button, testing && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Backend Connection'}
        </Text>
      </Pressable>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
});