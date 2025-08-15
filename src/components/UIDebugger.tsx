import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Alert,
  Switch,
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

interface UIElement {
  id: string;
  type: string;
  props: any;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: any;
}

interface UIDebuggerProps {
  visible: boolean;
  onClose: () => void;
}

export const UIDebugger: React.FC<UIDebuggerProps> = ({ visible, onClose }) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);
  const [showBounds, setShowBounds] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [showPadding, setShowPadding] = useState(true);
  const overlayRef = useRef<View>(null);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // 가상의 UI 요소들 (실제로는 React Native의 Inspector API나 Flipper를 사용해야 함)
  const mockUIElements: UIElement[] = [
    {
      id: 'header',
      type: 'View',
      layout: { x: 0, y: 0, width: screenWidth, height: 100 },
      style: { backgroundColor: '#ffffff', padding: 16 },
      props: {},
    },
    {
      id: 'title',
      type: 'Text',
      layout: { x: 16, y: 20, width: screenWidth - 32, height: 30 },
      style: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
      props: { children: '개발자 도구' },
    },
    {
      id: 'content',
      type: 'ScrollView',
      layout: { x: 0, y: 100, width: screenWidth, height: screenHeight - 200 },
      style: { flex: 1, padding: 16 },
      props: {},
    },
  ];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isInspecting,
    onPanResponderGrant: (evt) => {
      if (!isInspecting) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      
      // 터치 위치에서 UI 요소 찾기
      const element = mockUIElements.find(el => 
        locationX >= el.layout.x && 
        locationX <= el.layout.x + el.layout.width &&
        locationY >= el.layout.y && 
        locationY <= el.layout.y + el.layout.height
      );
      
      if (element) {
        setSelectedElement(element);
        setIsInspecting(false);
      }
    },
  });

  const getStyleInfo = (style: any) => {
    const styleInfo = [];
    
    if (style) {
      Object.entries(style).forEach(([key, value]) => {
        styleInfo.push(`${key}: ${JSON.stringify(value)}`);
      });
    }
    
    return styleInfo;
  };

  const startInspecting = () => {
    setIsInspecting(true);
    setSelectedElement(null);
    Alert.alert('UI 검사 모드', '검사하고 싶은 UI 요소를 터치하세요.');
  };

  const renderElementBounds = () => {
    if (!showBounds) return null;
    
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

  const renderMarginGuides = () => {
    if (!showMargins || !selectedElement) return null;
    
    const margin = selectedElement.style?.margin || 0;
    const marginTop = selectedElement.style?.marginTop || margin;
    const marginBottom = selectedElement.style?.marginBottom || margin;
    const marginLeft = selectedElement.style?.marginLeft || margin;
    const marginRight = selectedElement.style?.marginRight || margin;
    
    return (
      <View style={styles.guidesContainer} pointerEvents="none">
        {/* Top margin */}
        {marginTop > 0 && (
          <View
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
        )}
        
        {/* Bottom margin */}
        {marginBottom > 0 && (
          <View
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
        )}
        
        {/* Left margin */}
        {marginLeft > 0 && (
          <View
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
        )}
        
        {/* Right margin */}
        {marginRight > 0 && (
          <View
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
        )}
      </View>
    );
  };

  const renderPaddingGuides = () => {
    if (!showPadding || !selectedElement) return null;
    
    const padding = selectedElement.style?.padding || 0;
    const paddingTop = selectedElement.style?.paddingTop || padding;
    const paddingBottom = selectedElement.style?.paddingBottom || padding;
    const paddingLeft = selectedElement.style?.paddingLeft || padding;
    const paddingRight = selectedElement.style?.paddingRight || padding;
    
    return (
      <View style={styles.guidesContainer} pointerEvents="none">
        {/* Top padding */}
        {paddingTop > 0 && (
          <View
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
        )}
        
        {/* Bottom padding */}
        {paddingBottom > 0 && (
          <View
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
        )}
        
        {/* Left padding */}
        {paddingLeft > 0 && (
          <View
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
        )}
        
        {/* Right padding */}
        {paddingRight > 0 && (
          <View
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
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay for touch detection */}
        <View
          ref={overlayRef}
          style={styles.overlay}
          {...panResponder.panHandlers}
        >
          {renderElementBounds()}
          {renderMarginGuides()}
          {renderPaddingGuides()}
        </View>
        
        {/* Controls Panel */}
        <View style={styles.controlPanel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>UI 디버거</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, isInspecting && styles.activeButton]}
              onPress={startInspecting}
            >
              <IconSymbol name="magnifyingglass" size={16} color={isInspecting ? "#ffffff" : "#374151"} />
              <Text style={[styles.buttonText, isInspecting && styles.activeButtonText]}>
                요소 검사
              </Text>
            </TouchableOpacity>
            
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>경계선 표시</Text>
              <Switch
                value={showBounds}
                onValueChange={setShowBounds}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              />
            </View>
            
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>마진 표시</Text>
              <Switch
                value={showMargins}
                onValueChange={setShowMargins}
                trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
              />
            </View>
            
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>패딩 표시</Text>
              <Switch
                value={showPadding}
                onValueChange={setShowPadding}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>
          </View>
          
          {selectedElement && (
            <ScrollView style={styles.elementInfo}>
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
                {getStyleInfo(selectedElement.style).map((styleStr, index) => (
                  <Text key={index} style={styles.styleText}>
                    {styleStr}
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
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
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
  controls: {
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
  },
  elementInfo: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  elementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  styleText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
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
});