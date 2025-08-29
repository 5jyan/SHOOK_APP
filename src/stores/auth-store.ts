import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { secureStorage } from '@/lib/storage';
import { notificationService } from '@/services/notification';
import { authLogger } from '@/utils/logger-enhanced';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: 'user' | 'tester' | 'manager';
  picture?: string;
  givenName?: string;
  familyName?: string;
  verified?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// Modern Zustand store with persistence and immutable updates
export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      login: (user: User) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
          
          // Initialize push notifications after login
          notificationService.initialize().catch((error) => {
            authLogger.error('Failed to initialize notifications', { error: error instanceof Error ? error.message : String(error) });
          });
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.isLoading = false;
          
          // Clear push notification token (local only)
          notificationService.clearToken().catch((error) => {
            authLogger.error('Failed to clear notification token', { error: error instanceof Error ? error.message : String(error) });
          });
        }),

      updateUser: (updates: Partial<User>) =>
        set((state) => {
          if (state.user) {
            Object.assign(state.user, updates);
          }
        }),

      setLoading: (loading: boolean) =>
        set((state) => {
          state.isLoading = loading;
        }),
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await secureStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name: string, value: string) => {
          await secureStorage.setItem(name, value);
        },
        removeItem: async (name: string) => {
          await secureStorage.removeItem(name);
        },
      })),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);