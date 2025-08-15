import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebuggerStore } from '@/stores/debugger-store';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FloatingDebugButton: React.FC = () => {
  const {
    isActive,
    isDebuggingMode,
    panel,
    toggleDebuggingMode,
    setPanelPosition,
    setDragging,
  } = useDebuggerStore();

  const pan = useRef(new Animated.ValueXY()).current;
  const dragOffset = useRef({ x: 0, y: 0 });

  // 패널 드래그 핸들러
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setDragging(true);
      dragOffset.current = {
        x: evt.nativeEvent.pageX - panel.position.x,
        y: evt.nativeEvent.pageY - panel.position.y,
      };
    },
    onPanResponderMove: (evt) => {
      const newX = evt.nativeEvent.pageX - dragOffset.current.x;
      const newY = evt.nativeEvent.pageY - dragOffset.current.y;
      
      // 화면 경계 체크
      const buttonSize = 60;
      const boundedX = Math.max(10, Math.min(screenWidth - buttonSize - 10, newX));
      const boundedY = Math.max(50, Math.min(screenHeight - buttonSize - 50, newY));
      
      setPanelPosition({ x: boundedX, y: boundedY });
    },
    onPanResponderRelease: () => {
      setDragging(false);
    },
  });

  if (!isActive) return null;

  return (
    <View
      style={[
        styles.container,
        {
          left: panel.position.x,
          top: panel.position.y,
        },
        panel.isDragging && styles.dragging,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[
          styles.button,
          isDebuggingMode && styles.activeButton,
        ]}
        onPress={toggleDebuggingMode}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name={isDebuggingMode ? "bug-report" : "visibility"}
          size={24}
          color={isDebuggingMode ? "#ffffff" : "#6366f1"}
        />
        
        {/* 상태 표시 점 */}
        <View style={[
          styles.statusDot,
          isDebuggingMode && styles.activeDot
        ]} />
      </TouchableOpacity>
      
      {/* 상태 레이블 */}
      {isDebuggingMode && (
        <View style={styles.statusLabel}>
          <Text style={styles.statusText}>디버깅 중</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1002,
    elevation: 10,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dragging: {
    opacity: 0.8,
  },
  statusDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9ca3af',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  activeDot: {
    backgroundColor: '#10b981',
  },
  statusLabel: {
    position: 'absolute',
    top: -35,
    left: -10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});