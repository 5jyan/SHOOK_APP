import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        uiLogger.info('User not authenticated, redirecting to auth');
        router.replace('/auth-complex');
      } else {
        uiLogger.info('User authenticated, staying on protected route');
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    uiLogger.debug('Auth loading');
    return null; // Or loading spinner
  }

  if (!isAuthenticated) {
    uiLogger.debug('Not authenticated, rendering null while redirecting');
    return null; // Will redirect via useEffect
  }

  uiLogger.debug('Authenticated, rendering protected content');
  return <>{children}</>;
}