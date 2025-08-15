import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { AdvancedUIDebugger } from './AdvancedUIDebugger';

export const AdvancedUIDebuggerButton: React.FC = () => {
  const [showDebugger, setShowDebugger] = useState(false);

  const handlePress = () => {
    Alert.alert(
      '고급 UI 디버거',
      '고급 UI 디버깅 도구를 시작하시겠습니까?\n\n포함된 기능:\n• 그리드 오버레이\n• 측정 도구\n• 눈금자\n• 색상 추출기',
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
          <IconSymbol name="grid" size={20} color="#3b82f6" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>고급 UI 디버거</Text>
          <Text style={styles.description}>
            그리드, 측정도구, 눈금자, 색상추출 등 고급 디버깅 기능
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <IconSymbol name="chevron.right" size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
      
      <AdvancedUIDebugger
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
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
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