import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger, authLogger } from '@/utils/logger-enhanced';
import { apiService } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { ActivityIndicator, View } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const DEVICE_ID_KEY = '@device_id';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initializeAuth() {
      if (!isLoading && !isAuthenticated) {
        try {
          authLogger.info('User not authenticated, creating guest account');

          // Get or create device ID
          let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
          if (!deviceId) {
            deviceId = uuidv4();
            await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
            authLogger.info('New device ID created', { deviceId: deviceId.substring(0, 8) + '...' });
          } else {
            authLogger.info('Existing device ID found', { deviceId: deviceId.substring(0, 8) + '...' });
          }

          // Create or login guest account
          const guestUser = await apiService.createGuestAccount(deviceId);

          authLogger.info('Guest account created/retrieved', {
            userId: guestUser.id,
            isGuest: guestUser.isGuest
          });

          // Auto-login as guest
          login({
            id: guestUser.id.toString(),
            username: guestUser.username,
            email: guestUser.email || undefined,
            role: guestUser.role,
            isGuest: guestUser.isGuest,
          });

        } catch (error) {
          authLogger.error('Failed to create guest account', {
            error: error instanceof Error ? error.message : String(error)
          });
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    }

    initializeAuth();
  }, [isAuthenticated, isLoading, login]);

  if (isLoading || isInitializing) {
    uiLogger.debug('Auth loading or initializing');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4285f4" />
      </View>
    );
  }

  uiLogger.debug('Auth ready, rendering protected content');
  return <>{children}</>;
}