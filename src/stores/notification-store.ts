
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface NotificationState {
  isRegistering: boolean;
  isRegistered: boolean;
  error: string | null;
}

interface NotificationActions {
  setRegistering: (isRegistering: boolean) => void;
  setRegistered: (isRegistered: boolean, error?: string | null) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  isRegistering: false,
  isRegistered: false,
  error: null,
};

export const useNotificationStore = create<NotificationStore>()(
  immer((set) => ({
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
        state.isRegistered = isRegistered;
        state.error = error;
      }),
    reset: () => set(initialState),
  }))
);
