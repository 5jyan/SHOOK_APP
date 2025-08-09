import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}