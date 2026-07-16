import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger, authLogger } from '@/utils/logger-enhanced';
import { apiService } from '@/services/api';
import { getOrCreateDeviceId, isE2EMode } from '@/services/device-id';
import { Image, StyleSheet, View } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const e2eAuthInitialized = useRef(false);

  useEffect(() => {
    async function initializeAuth() {
      const shouldInitializeE2EAuth = isE2EMode() && !e2eAuthInitialized.current;
      if (!isLoading && (!isAuthenticated || shouldInitializeE2EAuth)) {
        if (shouldInitializeE2EAuth) {
          e2eAuthInitialized.current = true;
        }
        try {
          authLogger.info('User not authenticated, creating guest account');

          const deviceId = await getOrCreateDeviceId();
          authLogger.info('Device ID ready', {
            deviceId: deviceId.substring(0, 8) + '...',
            isE2E: isE2EMode(),
          });

          // Create or login guest account
          const guestUser = await apiService.createGuestAccount(deviceId);

          authLogger.info('Guest account created/retrieved', {
            userId: guestUser.id,
            isGuest: guestUser.isGuest
          });

          // Auto-login as guest
          const email = guestUser.email || undefined;
          login({
            id: guestUser.id.toString(),
            username: guestUser.username,
            role: guestUser.role,
            isGuest: guestUser.isGuest,
            ...(email ? { email } : {}),
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
      <View style={styles.startupPlaceholder}>
        <Image
          source={require('../../assets/images/shook-splash-v2.png')}
          style={styles.startupImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  uiLogger.debug('Auth ready, rendering protected content');
  return <>{children}</>;
}

const styles = StyleSheet.create({
  startupPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffcf7',
  },
  startupImage: {
    width: 220,
    height: 220,
  },
});
