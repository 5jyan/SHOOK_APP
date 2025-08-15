import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebuggerStore } from '@/stores/debugger-store';

export const GlobalDebuggerButton: React.FC = () => {
  const { isActive, toggleDebugger } = useDebuggerStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isActive && styles.activeButton
        ]}
        onPress={toggleDebugger}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          isActive && styles.activeIconContainer
        ]}>
          <MaterialIcons 
            name={isActive ? "visibility" : "visibility-off"} 
            size={20} 
            color={isActive ? "#ffffff" : "#6366f1"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            isActive && styles.activeTitle
          ]}>
            전역 UI 디버거
          </Text>
          <Text style={[
            styles.description,
            isActive && styles.activeDescription
          ]}>
            {isActive 
              ? '모든 화면에서 UI 디버깅 도구가 활성화됩니다' 
              : '화면을 벗어나지 않고 UI를 디버깅합니다'
            }
          </Text>
          {isActive && (
            <Text style={styles.statusText}>
              🟢 활성화됨 - 플로팅 패널을 드래그해서 이동하세요
            </Text>
          )}
        </View>
        <View style={styles.arrowContainer}>
          <MaterialIcons 
            name={isActive ? "toggle-on" : "toggle-off"} 
            size={24} 
            color={isActive ? "#10b981" : "#9ca3af"} 
          />
        </View>
      </TouchableOpacity>
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
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activeButton: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#3b82f6',
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
  activeTitle: {
    color: '#ffffff',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  activeDescription: {
    color: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    color: '#86efac',
    marginTop: 4,
    fontWeight: '500',
  },
  arrowContainer: {
    padding: 4,
  },
});