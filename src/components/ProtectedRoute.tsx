import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger, authLogger } from '@/utils/logger-enhanced';
import { apiService } from '@/services/api';
import { getOrCreateDeviceId, isE2EMode } from '@/services/device-id';
import { bootstrapAuth, type BootstrapUser } from '@/services/auth-bootstrap';
import { ShookLoadingScreen } from '@/components/ShookLoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const authBootstrapStarted = useRef(false);

  useEffect(() => {
    async function initializeAuth() {
      if (!isLoading && !authBootstrapStarted.current) {
        authBootstrapStarted.current = true;
        try {
          const result = await bootstrapAuth({
            hasCachedAuth: isAuthenticated,
            getCurrentUser: () => apiService.getCurrentUser(),
            getDeviceId: getOrCreateDeviceId,
            createGuestAccount: (deviceId) => apiService.createGuestAccount(deviceId),
          });

          authLogger.info('Authentication bootstrap completed', {
            source: result.source,
            userId: result.user?.id,
            isE2E: isE2EMode(),
          });

          if (result.user) {
            const user: BootstrapUser = result.user;
            const email = user.email || undefined;
            login({
              id: user.id.toString(),
              username: user.username,
              role: user.role,
              ...(user.isGuest !== undefined ? { isGuest: user.isGuest } : {}),
              ...(email ? { email } : {}),
            });
          }

        } catch (error) {
          authLogger.error('Failed to initialize authentication', {
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
    return <ShookLoadingScreen message="앱을 준비하는 중..." />;
  }

  uiLogger.debug('Auth ready, rendering protected content');
  return <>{children}</>;
}
