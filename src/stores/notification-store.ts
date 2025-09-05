
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface NotificationState {
  isRegistering: boolean;
  isRegistered: boolean;
  error: string | null;
  isUIEnabled: boolean; // UI toggle state
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  manualUIOverride: boolean; // Prevent automatic UI state updates when user is manually controlling
  lastSyncTime: number | null; // Timestamp of last backend sync
}

interface NotificationActions {
  setRegistering: (isRegistering: boolean) => void;
  setRegistered: (isRegistered: boolean, error?: string | null) => void;
  setUIEnabled: (enabled: boolean, isManual?: boolean) => void;
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;
  updateUIState: () => void; // Compute UI state based on permissions and registration
  setLastSyncTime: (time: number) => void; // Update last sync time
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  isRegistering: false,
  isRegistered: false,
  error: null,
  isUIEnabled: false,
  permissionStatus: 'undetermined',
  manualUIOverride: false,
  lastSyncTime: null,
};

export const useNotificationStore = create<NotificationStore>()(
  immer((set, get) => ({
    ...initialState,
    setRegistering: (isRegistering) =>
      set((state) => {
        state.isRegistering = isRegistering;
        if (isRegistering) {
          state.error = null;
        }
      }),
    setRegistered: (isRegistered, error = null) =>
      set((state) => {
        const wasRegistered = state.isRegistered;
        state.isRegistered = isRegistered;
        state.error = error;
        
        // Only auto-update UI state if not under manual control
        if (!state.manualUIOverride) {
          const shouldBeEnabled = state.permissionStatus === 'granted' && isRegistered;
          state.isUIEnabled = shouldBeEnabled;
          
          // Log state changes for debugging
          console.log('[NotificationStore] Registration state updated', {
            wasRegistered,
            isRegistered,
            permissionStatus: state.permissionStatus,
            shouldBeEnabled,
            wasUIEnabled: state.isUIEnabled,
            finalUIEnabled: shouldBeEnabled,
            manualUIOverride: state.manualUIOverride,
            error
          });
        }
      }),
    setUIEnabled: (enabled, isManual = false) =>
      set((state) => {
        state.isUIEnabled = enabled;
        if (isManual) {
          // Set override flag when user manually controls the toggle
          state.manualUIOverride = true;
          // Clear override after a short delay to allow auto-updates later
          setTimeout(() => {
            set((state) => {
              state.manualUIOverride = false;
            });
          }, 2000);
        }
      }),
    setPermissionStatus: (status) =>
      set((state) => {
        state.permissionStatus = status;
        // Only auto-update UI state if not under manual control
        if (!state.manualUIOverride) {
          const shouldBeEnabled = status === 'granted' && state.isRegistered;
          state.isUIEnabled = shouldBeEnabled;
        }
      }),
    updateUIState: () =>
      set((state) => {
        if (!state.manualUIOverride) {
          const shouldBeEnabled = state.permissionStatus === 'granted' && state.isRegistered;
          state.isUIEnabled = shouldBeEnabled;
        }
      }),
    setLastSyncTime: (time) =>
      set((state) => {
        state.lastSyncTime = time;
      }),
    reset: () => set(initialState),
  }))
);
