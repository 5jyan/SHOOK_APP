import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebuggerStore } from '@/stores/debugger-store';
import { SummaryTheme } from '@/constants/SummaryTheme';

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
            color={SummaryTheme.colors.textPrimary}
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
            color={isActive ? SummaryTheme.colors.textPrimary : SummaryTheme.colors.textMuted}
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
    backgroundColor: SummaryTheme.colors.surface,
    borderWidth: 2,
    borderColor: SummaryTheme.colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activeButton: {
    backgroundColor: SummaryTheme.colors.pressed,
    borderColor: SummaryTheme.colors.textMuted,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SummaryTheme.colors.pressed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: SummaryTheme.colors.textMuted,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: SummaryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  activeTitle: {
    color: SummaryTheme.colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: SummaryTheme.colors.textSecondary,
    lineHeight: 20,
  },
  activeDescription: {
    color: SummaryTheme.colors.textSecondary,
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
