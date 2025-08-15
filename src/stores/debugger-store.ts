import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface DebuggerState {
  // 전역 디버거 활성화 상태
  isActive: boolean;
  
  // 디버깅 모드 (실제 오버레이 표시 여부)
  isDebuggingMode: boolean;
  
  // 디버거 도구 설정
  tools: {
    showGrid: boolean;
    gridSize: number;
    showRuler: boolean;
    showBounds: boolean;
    showMargins: boolean;
    showPadding: boolean;
    measureMode: boolean;
    colorPickerMode: boolean;
    inspectMode: boolean;
  };
  
  // 측정 도구 데이터
  measurement: {
    startPoint: { x: number; y: number } | null;
    endPoint: { x: number; y: number } | null;
  };
  
  // 선택된 색상
  selectedColor: string;
  
  // 선택된 UI 요소
  selectedElement: {
    id: string;
    type: string;
    layout: { x: number; y: number; width: number; height: number };
    style: any;
    props: any;
  } | null;
  
  // 플로팅 패널 위치 및 상태
  panel: {
    isMinimized: boolean;
    position: { x: number; y: number };
    isDragging: boolean;
  };
}

interface DebuggerActions {
  // 전역 디버거 토글
  toggleDebugger: () => void;
  setActive: (active: boolean) => void;
  
  // 디버깅 모드 토글
  toggleDebuggingMode: () => void;
  setDebuggingMode: (mode: boolean) => void;
  
  // 도구 설정
  toggleTool: (tool: keyof DebuggerState['tools']) => void;
  setGridSize: (size: number) => void;
  
  // 측정 도구
  setMeasurementPoint: (point: { x: number; y: number }, type: 'start' | 'end') => void;
  clearMeasurement: () => void;
  
  // 색상 선택
  setSelectedColor: (color: string) => void;
  
  // UI 요소 선택
  setSelectedElement: (element: DebuggerState['selectedElement']) => void;
  
  // 패널 관리
  toggleMinimized: () => void;
  setPanelPosition: (position: { x: number; y: number }) => void;
  setDragging: (isDragging: boolean) => void;
  
  // 모든 설정 리셋
  resetDebugger: () => void;
}

type DebuggerStore = DebuggerState & DebuggerActions;

const initialState: DebuggerState = {
  isActive: false,
  isDebuggingMode: false,
  tools: {
    showGrid: true,
    gridSize: 8,
    showRuler: false,
    showBounds: true,
    showMargins: true,
    showPadding: true,
    measureMode: false,
    colorPickerMode: false,
    inspectMode: false,
  },
  measurement: {
    startPoint: null,
    endPoint: null,
  },
  selectedColor: '#000000',
  selectedElement: null,
  panel: {
    isMinimized: false,
    position: { x: 20, y: 100 },
    isDragging: false,
  },
};

export const useDebuggerStore = create<DebuggerStore>()(
  immer((set, get) => ({
    ...initialState,
    
    toggleDebugger: () => set((state) => {
      state.isActive = !state.isActive;
      if (!state.isActive) {
        // 디버거가 비활성화되면 모든 모드 리셋
        state.isDebuggingMode = false;
        state.tools.measureMode = false;
        state.tools.colorPickerMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
      }
    }),
    
    setActive: (active) => set((state) => {
      state.isActive = active;
      if (!active) {
        state.isDebuggingMode = false;
        state.tools.measureMode = false;
        state.tools.colorPickerMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
      }
    }),
    
    toggleDebuggingMode: () => set((state) => {
      state.isDebuggingMode = !state.isDebuggingMode;
      if (!state.isDebuggingMode) {
        // 디버깅 모드가 비활성화되면 상호작용 모드들 리셋
        state.tools.measureMode = false;
        state.tools.colorPickerMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
      }
    }),
    
    setDebuggingMode: (mode) => set((state) => {
      state.isDebuggingMode = mode;
      if (!mode) {
        state.tools.measureMode = false;
        state.tools.colorPickerMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
      }
    }),
    
    toggleTool: (tool) => set((state) => {
      state.tools[tool] = !state.tools[tool];
      
      // 상호 배타적 모드 처리
      if (tool === 'measureMode' && state.tools.measureMode) {
        state.tools.colorPickerMode = false;
        state.tools.inspectMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
        state.selectedElement = null;
      } else if (tool === 'colorPickerMode' && state.tools.colorPickerMode) {
        state.tools.measureMode = false;
        state.tools.inspectMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
        state.selectedElement = null;
      } else if (tool === 'inspectMode' && state.tools.inspectMode) {
        state.tools.measureMode = false;
        state.tools.colorPickerMode = false;
        state.measurement.startPoint = null;
        state.measurement.endPoint = null;
      }
    }),
    
    setGridSize: (size) => set((state) => {
      state.tools.gridSize = Math.max(1, Math.min(100, size));
    }),
    
    setMeasurementPoint: (point, type) => set((state) => {
      if (type === 'start') {
        state.measurement.startPoint = point;
        state.measurement.endPoint = null;
      } else {
        state.measurement.endPoint = point;
      }
    }),
    
    clearMeasurement: () => set((state) => {
      state.measurement.startPoint = null;
      state.measurement.endPoint = null;
    }),
    
    setSelectedColor: (color) => set((state) => {
      state.selectedColor = color;
    }),
    
    setSelectedElement: (element) => set((state) => {
      state.selectedElement = element;
    }),
    
    toggleMinimized: () => set((state) => {
      state.panel.isMinimized = !state.panel.isMinimized;
    }),
    
    setPanelPosition: (position) => set((state) => {
      state.panel.position = position;
    }),
    
    setDragging: (isDragging) => set((state) => {
      state.panel.isDragging = isDragging;
    }),
    
    resetDebugger: () => set((state) => {
      Object.assign(state, initialState);
    }),
  }))
);