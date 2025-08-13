import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('🚪 User not authenticated, redirecting to auth...');
        router.replace('/auth-complex');
      } else {
        console.log('✅ User authenticated, staying on protected route');
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    console.log('⏳ Auth loading...');
    return null; // Or loading spinner
  }

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, rendering null while redirecting...');
    return null; // Will redirect via useEffect
  }

  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
}