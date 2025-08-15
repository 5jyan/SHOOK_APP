import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

interface DebuggerProps {
  visible: boolean;
  onClose: () => void;
}

interface StyleProperty {
  property: string;
  value: any;
  category: 'layout' | 'spacing' | 'typography' | 'color' | 'border' | 'other';
}

export const AdvancedUIDebugger: React.FC<DebuggerProps> = ({ visible, onClose }) => {
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(8);
  const [showRuler, setShowRuler] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [measureMode, setMeasureMode] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // 그리드 렌더링
  const renderGrid = () => {
    if (!showGrid) return null;

    const verticalLines = [];
    const horizontalLines = [];

    // 세로선
    for (let x = 0; x <= screenWidth; x += gridSize) {
      verticalLines.push(
        <View
          key={`v-${x}`}
          style={[
            styles.gridLine,
            {
              left: x,
              top: 0,
              width: 1,
              height: screenHeight,
            },
          ]}
        />
      );
    }

    // 가로선
    for (let y = 0; y <= screenHeight; y += gridSize) {
      horizontalLines.push(
        <View
          key={`h-${y}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: y,
              width: screenWidth,
              height: 1,
            },
          ]}
        />
      );
    }

    return (
      <View style={styles.gridContainer} pointerEvents="none">
        {verticalLines}
        {horizontalLines}
      </View>
    );
  };

  // 눈금자 렌더링
  const renderRuler = () => {
    if (!showRuler) return null;

    const topRulerMarks = [];
    const leftRulerMarks = [];

    // 상단 눈금자
    for (let x = 0; x <= screenWidth; x += 50) {
      topRulerMarks.push(
        <View key={`top-${x}`} style={[styles.rulerMark, { left: x, top: 0 }]}>
          <Text style={styles.rulerText}>{x}</Text>
        </View>
      );
    }

    // 왼쪽 눈금자
    for (let y = 0; y <= screenHeight; y += 50) {
      leftRulerMarks.push(
        <View key={`left-${y}`} style={[styles.rulerMark, { left: 0, top: y }]}>
          <Text style={styles.rulerText}>{y}</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.topRuler} pointerEvents="none">
          {topRulerMarks}
        </View>
        <View style={styles.leftRuler} pointerEvents="none">
          {leftRulerMarks}
        </View>
      </>
    );
  };

  // 측정 도구 렌더링
  const renderMeasurementTool = () => {
    if (!measureMode || !startPoint || !endPoint) return null;

    const distance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );

    return (
      <View style={styles.measurementContainer} pointerEvents="none">
        {/* 측정선 */}
        <View
          style={[
            styles.measurementLine,
            {
              left: Math.min(startPoint.x, endPoint.x),
              top: Math.min(startPoint.y, endPoint.y),
              width: Math.abs(endPoint.x - startPoint.x),
              height: Math.abs(endPoint.y - startPoint.y),
            },
          ]}
        />
        
        {/* 시작점 */}
        <View
          style={[
            styles.measurementPoint,
            { left: startPoint.x - 4, top: startPoint.y - 4 },
          ]}
        />
        
        {/* 끝점 */}
        <View
          style={[
            styles.measurementPoint,
            { left: endPoint.x - 4, top: endPoint.y - 4 },
          ]}
        />
        
        {/* 거리 표시 */}
        <View
          style={[
            styles.distanceLabel,
            {
              left: (startPoint.x + endPoint.x) / 2 - 30,
              top: (startPoint.y + endPoint.y) / 2 - 15,
            },
          ]}
        >
          <Text style={styles.distanceText}>{Math.round(distance)}px</Text>
        </View>
      </View>
    );
  };

  // 색상 추출기
  const extractColor = (x: number, y: number) => {
    // 실제로는 화면 캡처 API나 네이티브 모듈이 필요
    // 여기서는 시뮬레이션
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setSelectedColor(randomColor);
  };

  // 화면 터치 핸들러
  const handleScreenTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    if (measureMode) {
      if (!startPoint) {
        setStartPoint({ x: locationX, y: locationY });
      } else if (!endPoint) {
        setEndPoint({ x: locationX, y: locationY });
      } else {
        // 리셋
        setStartPoint({ x: locationX, y: locationY });
        setEndPoint(null);
      }
    }
    
    if (showColorPicker) {
      extractColor(locationX, locationY);
    }
  };

  // 스타일 속성 분석
  const analyzeStyleProperties = (style: any): StyleProperty[] => {
    if (!style) return [];
    
    const properties: StyleProperty[] = [];
    
    Object.entries(style).forEach(([key, value]) => {
      let category: StyleProperty['category'] = 'other';
      
      if (['width', 'height', 'position', 'top', 'left', 'right', 'bottom', 'flex', 'flexDirection', 'justifyContent', 'alignItems'].includes(key)) {
        category = 'layout';
      } else if (['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].includes(key)) {
        category = 'spacing';
      } else if (['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign'].includes(key)) {
        category = 'typography';
      } else if (['color', 'backgroundColor', 'opacity'].includes(key)) {
        category = 'color';
      } else if (['borderWidth', 'borderColor', 'borderRadius', 'borderStyle'].includes(key)) {
        category = 'border';
      }
      
      properties.push({ property: key, value, category });
    });
    
    return properties;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 화면 오버레이 */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleScreenTouch}
        >
          {renderGrid()}
          {renderRuler()}
          {renderMeasurementTool()}
        </TouchableOpacity>
        
        {/* 컨트롤 패널 */}
        <View style={styles.controlPanel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>고급 UI 디버거</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.controlContent}>
            {/* 그리드 설정 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>그리드</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>그리드 표시</Text>
                <Switch
                  value={showGrid}
                  onValueChange={setShowGrid}
                  trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                />
              </View>
              {showGrid && (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>그리드 크기 (px)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={gridSize.toString()}
                    onChangeText={(text) => {
                      const size = parseInt(text) || 8;
                      setGridSize(Math.max(1, Math.min(100, size)));
                    }}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
            
            {/* 측정 도구 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>측정 도구</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>거리 측정</Text>
                <Switch
                  value={measureMode}
                  onValueChange={setMeasureMode}
                  trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                />
              </View>
              {measureMode && (
                <Text style={styles.helpText}>
                  화면을 터치하여 두 점 사이의 거리를 측정하세요
                </Text>
              )}
            </View>
            
            {/* 눈금자 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>눈금자</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>눈금자 표시</Text>
                <Switch
                  value={showRuler}
                  onValueChange={setShowRuler}
                  trackColor={{ false: '#d1d5db', true: '#10b981' }}
                />
              </View>
            </View>
            
            {/* 색상 추출기 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>색상 추출기</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>색상 추출</Text>
                <Switch
                  value={showColorPicker}
                  onValueChange={setShowColorPicker}
                  trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                />
              </View>
              {showColorPicker && (
                <View style={styles.colorDisplay}>
                  <View style={[styles.colorSwatch, { backgroundColor: selectedColor }]} />
                  <Text style={styles.colorText}>{selectedColor}</Text>
                </View>
              )}
            </View>
            
            {/* 화면 정보 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>화면 정보</Text>
              <Text style={styles.infoText}>크기: {screenWidth} × {screenHeight}</Text>
              <Text style={styles.infoText}>비율: {(screenWidth / screenHeight).toFixed(2)}</Text>
              <Text style={styles.infoText}>픽셀 밀도: {Dimensions.get('window').scale}x</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  overlay: {
    flex: 1,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  controlContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  colorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  colorText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  // 그리드 스타일
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  // 눈금자 스타일
  topRuler: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  leftRuler: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  rulerMark: {
    position: 'absolute',
  },
  rulerText: {
    fontSize: 10,
    color: '#374151',
  },
  // 측정 도구 스타일
  measurementContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  measurementLine: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  measurementPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  distanceLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
});