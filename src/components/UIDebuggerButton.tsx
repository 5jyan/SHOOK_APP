import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { UIDebugger } from './UIDebugger';

export const UIDebuggerButton: React.FC = () => {
  const [showDebugger, setShowDebugger] = useState(false);

  const handlePress = () => {
    Alert.alert(
      'UI 디버거',
      'UI 디버거를 시작하시겠습니까? 화면의 UI 요소들을 검사할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작',
          onPress: () => setShowDebugger(true),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconSymbol name="square.and.pencil" size={20} color="#8b5cf6" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>UI 디버거</Text>
          <Text style={styles.description}>
            UI 요소의 레이아웃, 마진, 패딩을 시각적으로 검사합니다
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <IconSymbol name="chevron.right" size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
      
      <UIDebugger
        visible={showDebugger}
        onClose={() => setShowDebugger(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  arrowContainer: {
    padding: 4,
  },
});