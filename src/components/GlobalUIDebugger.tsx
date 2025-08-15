import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ScrollView,
  Switch,
  TextInput,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebuggerStore } from '@/stores/debugger-store';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const GlobalUIDebugger: React.FC = () => {
  const {
    isActive,
    isDebuggingMode,
    tools,
    measurement,
    selectedColor,
    selectedElement,
    panel,
    toggleTool,
    setGridSize,
    setMeasurementPoint,
    clearMeasurement,
    setSelectedColor,
    setSelectedElement,
    toggleMinimized,
    setPanelPosition,
    setDragging,
    setActive,
    setDebuggingMode,
  } = useDebuggerStore();

  const panelRef = useRef<View>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 가상의 UI 요소들 (실제로는 React Native의 Inspector API 사용)
  const mockUIElements = [
    {
      id: 'header',
      type: 'View',
      layout: { x: 0, y: 0, width: screenWidth, height: 100 },
      style: { backgroundColor: '#ffffff', padding: 16, margin: 0 },
      props: { testID: 'header' },
    },
    {
      id: 'title',
      type: 'Text',
      layout: { x: 16, y: 20, width: screenWidth - 32, height: 30 },
      style: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
      props: { children: '개발자 도구' },
    },
    {
      id: 'floating-button',
      type: 'TouchableOpacity',
      layout: { x: panel.position.x, y: panel.position.y, width: 60, height: 60 },
      style: { borderRadius: 30, backgroundColor: '#3b82f6', margin: 10 },
      props: { activeOpacity: 0.8 },
    },
    {
      id: 'content',
      type: 'ScrollView',
      layout: { x: 0, y: 100, width: screenWidth, height: screenHeight - 200 },
      style: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
      props: { showsVerticalScrollIndicator: false },
    },
  ];

  // 패널 드래그 핸들러
  const panelPanResponder = PanResponder.create({
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
      const boundedX = Math.max(0, Math.min(screenWidth - 280, newX));
      const boundedY = Math.max(0, Math.min(screenHeight - 400, newY));
      
      setPanelPosition({ x: boundedX, y: boundedY });
    },
    onPanResponderRelease: () => {
      setDragging(false);
    },
  });

  // 화면 터치 핸들러 (측정/색상 추출/UI 검사용) - 디버깅 모드일 때만 활성화
  const screenPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDebuggingMode && (tools.measureMode || tools.colorPickerMode || tools.inspectMode),
    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      
      if (tools.measureMode) {
        if (!measurement.startPoint) {
          setMeasurementPoint({ x: pageX, y: pageY }, 'start');
        } else if (!measurement.endPoint) {
          setMeasurementPoint({ x: pageX, y: pageY }, 'end');
        } else {
          clearMeasurement();
          setMeasurementPoint({ x: pageX, y: pageY }, 'start');
        }
      }
      
      if (tools.colorPickerMode) {
        // 색상 추출 시뮬레이션
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setSelectedColor(randomColor);
      }
      
      if (tools.inspectMode) {
        // UI 요소 검사
        const element = mockUIElements.find(el => 
          pageX >= el.layout.x && 
          pageX <= el.layout.x + el.layout.width &&
          pageY >= el.layout.y && 
          pageY <= el.layout.y + el.layout.height
        );
        
        if (element) {
          setSelectedElement(element);
        }
      }
    },
  });

  if (!isActive) return null;

  // 그리드 렌더링 - 디버깅 모드일 때만 표시
  const renderGrid = () => {
    if (!isDebuggingMode || !tools.showGrid) return null;

    const lines = [];
    
    // 세로선
    for (let x = 0; x <= screenWidth; x += tools.gridSize) {
      lines.push(
        <View
          key={`v-${x}`}
          style={[styles.gridLine, { left: x, width: 1, height: screenHeight }]}
        />
      );
    }
    
    // 가로선
    for (let y = 0; y <= screenHeight; y += tools.gridSize) {
      lines.push(
        <View
          key={`h-${y}`}
          style={[styles.gridLine, { top: y, height: 1, width: screenWidth }]}
        />
      );
    }

    return (
      <View style={styles.gridContainer} pointerEvents="none">
        {lines}
      </View>
    );
  };

  // 눈금자 렌더링 - 디버깅 모드일 때만 표시
  const renderRuler = () => {
    if (!isDebuggingMode || !tools.showRuler) return null;

    const topMarks = [];
    const leftMarks = [];

    for (let x = 0; x <= screenWidth; x += 50) {
      topMarks.push(
        <Text key={`top-${x}`} style={[styles.rulerText, { left: x + 2, top: 2 }]}>
          {x}
        </Text>
      );
    }

    for (let y = 0; y <= screenHeight; y += 50) {
      leftMarks.push(
        <Text key={`left-${y}`} style={[styles.rulerText, { left: 2, top: y + 2 }]}>
          {y}
        </Text>
      );
    }

    return (
      <>
        <View style={styles.topRuler} pointerEvents="none">
          {topMarks}
        </View>
        <View style={styles.leftRuler} pointerEvents="none">
          {leftMarks}
        </View>
      </>
    );
  };

  // 측정선 렌더링 - 디버깅 모드일 때만 표시
  const renderMeasurement = () => {
    if (!isDebuggingMode || !tools.measureMode || !measurement.startPoint) return null;

    const { startPoint, endPoint } = measurement;
    
    if (!endPoint) {
      return (
        <View
          style={[
            styles.measurementPoint,
            { left: startPoint.x - 4, top: startPoint.y - 4 }
          ]}
          pointerEvents="none"
        />
      );
    }

    const distance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );

    return (
      <View style={styles.measurementContainer} pointerEvents="none">
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
        <View style={[styles.measurementPoint, { left: startPoint.x - 4, top: startPoint.y - 4 }]} />
        <View style={[styles.measurementPoint, { left: endPoint.x - 4, top: endPoint.y - 4 }]} />
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

  // UI 요소 경계선 렌더링
  const renderElementBounds = () => {
    if (!isDebuggingMode || !tools.showBounds) return null;

    return mockUIElements.map((element) => (
      <View
        key={element.id}
        style={[
          styles.elementBounds,
          {
            left: element.layout.x,
            top: element.layout.y,
            width: element.layout.width,
            height: element.layout.height,
          },
          selectedElement?.id === element.id && styles.selectedElementBounds,
        ]}
        pointerEvents="none"
      />
    ));
  };

  // 마진/패딩 가이드 렌더링
  const renderMarginPaddingGuides = () => {
    if (!isDebuggingMode || !selectedElement) return null;
    
    const guides = [];
    
    // 마진 가이드
    if (tools.showMargins) {
      const margin = selectedElement.style?.margin || 0;
      const marginTop = selectedElement.style?.marginTop || margin;
      const marginBottom = selectedElement.style?.marginBottom || margin;
      const marginLeft = selectedElement.style?.marginLeft || margin;
      const marginRight = selectedElement.style?.marginRight || margin;
      
      if (marginTop > 0) {
        guides.push(
          <View
            key="margin-top"
            style={[
              styles.marginGuide,
              {
                left: selectedElement.layout.x,
                top: selectedElement.layout.y - marginTop,
                width: selectedElement.layout.width,
                height: marginTop,
              },
            ]}
          />
        );
      }
      
      if (marginBottom > 0) {
        guides.push(
          <View
            key="margin-bottom"
            style={[
              styles.marginGuide,
              {
                left: selectedElement.layout.x,
                top: selectedElement.layout.y + selectedElement.layout.height,
                width: selectedElement.layout.width,
                height: marginBottom,
              },
            ]}
          />
        );
      }
      
      if (marginLeft > 0) {
        guides.push(
          <View
            key="margin-left"
            style={[
              styles.marginGuide,
              {
                left: selectedElement.layout.x - marginLeft,
                top: selectedElement.layout.y,
                width: marginLeft,
                height: selectedElement.layout.height,
              },
            ]}
          />
        );
      }
      
      if (marginRight > 0) {
        guides.push(
          <View
            key="margin-right"
            style={[
              styles.marginGuide,
              {
                left: selectedElement.layout.x + selectedElement.layout.width,
                top: selectedElement.layout.y,
                width: marginRight,
                height: selectedElement.layout.height,
              },
            ]}
          />
        );
      }
    }
    
    // 패딩 가이드
    if (tools.showPadding) {
      const padding = selectedElement.style?.padding || 0;
      const paddingTop = selectedElement.style?.paddingTop || padding;
      const paddingBottom = selectedElement.style?.paddingBottom || padding;
      const paddingLeft = selectedElement.style?.paddingLeft || padding;
      const paddingRight = selectedElement.style?.paddingRight || padding;
      
      if (paddingTop > 0) {
        guides.push(
          <View
            key="padding-top"
            style={[
              styles.paddingGuide,
              {
                left: selectedElement.layout.x,
                top: selectedElement.layout.y,
                width: selectedElement.layout.width,
                height: paddingTop,
              },
            ]}
          />
        );
      }
      
      if (paddingBottom > 0) {
        guides.push(
          <View
            key="padding-bottom"
            style={[
              styles.paddingGuide,
              {
                left: selectedElement.layout.x,
                top: selectedElement.layout.y + selectedElement.layout.height - paddingBottom,
                width: selectedElement.layout.width,
                height: paddingBottom,
              },
            ]}
          />
        );
      }
      
      if (paddingLeft > 0) {
        guides.push(
          <View
            key="padding-left"
            style={[
              styles.paddingGuide,
              {
                left: selectedElement.layout.x,
                top: selectedElement.layout.y,
                width: paddingLeft,
                height: selectedElement.layout.height,
              },
            ]}
          />
        );
      }
      
      if (paddingRight > 0) {
        guides.push(
          <View
            key="padding-right"
            style={[
              styles.paddingGuide,
              {
                left: selectedElement.layout.x + selectedElement.layout.width - paddingRight,
                top: selectedElement.layout.y,
                width: paddingRight,
                height: selectedElement.layout.height,
              },
            ]}
          />
        );
      }
    }
    
    return guides.length > 0 ? (
      <View style={styles.guidesContainer} pointerEvents="none">
        {guides}
      </View>
    ) : null;
  };

  return (
    <>
      {/* 시각적 오버레이 (터치 이벤트 없음) */}
      <View style={styles.visualOverlay} pointerEvents="none">
        {renderGrid()}
        {renderRuler()}
        {renderMeasurement()}
        {renderElementBounds()}
        {renderMarginPaddingGuides()}
      </View>

      {/* 터치 감지 오버레이 (측정/색상 추출/UI 검사 모드일 때만) */}
      {isDebuggingMode && (tools.measureMode || tools.colorPickerMode || tools.inspectMode) && (
        <View
          style={styles.touchOverlay}
          {...screenPanResponder.panHandlers}
        />
      )}

      {/* 플로팅 컨트롤 패널 - 디버깅 모드일 때만 표시 */}
      {isDebuggingMode && (
        <View
          ref={panelRef}
          style={[
            styles.floatingPanel,
            {
              left: panel.position.x + 70, // 플로팅 버튼 옆에 위치
              top: panel.position.y,
              opacity: panel.isDragging ? 0.8 : 1,
            },
            panel.isMinimized && styles.minimizedPanel,
          ]}
        >
        {/* 패널 헤더 */}
        <View style={styles.panelHeader} {...panelPanResponder.panHandlers}>
          <MaterialIcons name="drag-indicator" size={16} color="#6b7280" />
          <Text style={styles.panelTitle}>UI 디버거</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={toggleMinimized} style={styles.headerButton}>
              <MaterialIcons 
                name={panel.isMinimized ? "expand-more" : "expand-less"} 
                size={16} 
                color="#6b7280" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDebuggingMode(false)} style={styles.headerButton}>
              <MaterialIcons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 패널 내용 */}
        {!panel.isMinimized && (
          <ScrollView style={styles.panelContent} showsVerticalScrollIndicator={false}>
            {/* UI 검사 도구 */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>UI 검사</Text>
                <Switch
                  value={tools.inspectMode}
                  onValueChange={() => toggleTool('inspectMode')}
                  trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>경계선</Text>
                <Switch
                  value={tools.showBounds}
                  onValueChange={() => toggleTool('showBounds')}
                  trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                />
              </View>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>마진</Text>
                <Switch
                  value={tools.showMargins}
                  onValueChange={() => toggleTool('showMargins')}
                  trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                  thumbColor="#ffffff"
                />
              </View>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>패딩</Text>
                <Switch
                  value={tools.showPadding}
                  onValueChange={() => toggleTool('showPadding')}
                  trackColor={{ false: '#d1d5db', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 그리드 설정 */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>그리드</Text>
                <Switch
                  value={tools.showGrid}
                  onValueChange={() => toggleTool('showGrid')}
                  trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                />
              </View>
              {tools.showGrid && (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>크기</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tools.gridSize.toString()}
                    onChangeText={(text) => {
                      const size = parseInt(text) || 8;
                      setGridSize(size);
                    }}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* 눈금자 */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>눈금자</Text>
              <Switch
                value={tools.showRuler}
                onValueChange={() => toggleTool('showRuler')}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* 측정 도구 */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>측정</Text>
                <Switch
                  value={tools.measureMode}
                  onValueChange={() => toggleTool('measureMode')}
                  trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                  thumbColor="#ffffff"
                />
              </View>
              {tools.measureMode && (
                <TouchableOpacity onPress={clearMeasurement} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>측정 지우기</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 색상 추출기 */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>색상 추출</Text>
                <Switch
                  value={tools.colorPickerMode}
                  onValueChange={() => toggleTool('colorPickerMode')}
                  trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
              {tools.colorPickerMode && (
                <View style={styles.colorDisplay}>
                  <View style={[styles.colorSwatch, { backgroundColor: selectedColor }]} />
                  <Text style={styles.colorText}>{selectedColor}</Text>
                </View>
              )}
            </View>

            {/* 선택된 UI 요소 정보 */}
            {selectedElement && (
              <View style={styles.elementInfoSection}>
                <Text style={styles.elementTitle}>
                  선택된 요소: {selectedElement.type}
                </Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>레이아웃</Text>
                  <Text style={styles.infoText}>
                    위치: ({selectedElement.layout.x}, {selectedElement.layout.y})
                  </Text>
                  <Text style={styles.infoText}>
                    크기: {selectedElement.layout.width} × {selectedElement.layout.height}
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>스타일</Text>
                  {Object.entries(selectedElement.style || {}).map(([key, value]) => (
                    <Text key={key} style={styles.styleText}>
                      {key}: {JSON.stringify(value)}
                    </Text>
                  ))}
                </View>
                
                {selectedElement.props && Object.keys(selectedElement.props).length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Props</Text>
                    {Object.entries(selectedElement.props).map(([key, value]) => (
                      <Text key={key} style={styles.infoText}>
                        {key}: {JSON.stringify(value)}
                      </Text>
                    ))}
                  </View>
                )}
                
                <TouchableOpacity 
                  onPress={() => setSelectedElement(null)} 
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>선택 해제</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  visualOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  floatingPanel: {
    position: 'absolute',
    width: 280,
    maxHeight: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  minimizedPanel: {
    maxHeight: 50,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  panelTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    padding: 4,
  },
  panelContent: {
    maxHeight: 320,
    padding: 12,
  },
  section: {
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
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    width: 60,
    textAlign: 'center',
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
  colorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  colorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
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
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  leftRuler: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  rulerText: {
    position: 'absolute',
    fontSize: 9,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  // UI 요소 관련 스타일
  elementBounds: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  selectedElementBounds: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  guidesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marginGuide: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  paddingGuide: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  elementInfoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  elementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  styleText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 1,
  },
});