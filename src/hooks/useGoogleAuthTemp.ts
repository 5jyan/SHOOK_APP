import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { secureStorage } from '@/lib/storage';
import { apiService } from '@/services/api';
import { notificationService } from '@/services/notification';

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, logout, setLoading } = useAuthStore();

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);

      console.log('🚀 Starting temporary mobile login...');

      // Skip the health check and go directly to login
      console.log('🔍 Attempting mobile login directly...');

      // Temporary: simulate Google user data
      const tempEmail = 'mobile.test@example.com';
      const tempUsername = 'Mobile Test User';

      console.log('📤 Sending mobile login to backend...');
      const loginResponse = await apiService.mobileLogin(tempEmail, tempUsername);

      console.log('📋 Login response received:', {
        success: loginResponse.success,
        error: loginResponse.error,
        hasData: !!loginResponse.data,
        hasUser: !!(loginResponse.data as any)?.user
      });

      if (loginResponse.success && loginResponse.data?.user) {
        console.log('✅ Backend mobile login successful:', loginResponse.data.user);
        console.log('🔍 [Login] User role from backend:', loginResponse.data.user.role);
        
        // Transform backend user to mobile app format
        const user = {
          id: loginResponse.data.user.id.toString(),
          username: loginResponse.data.user.username,
          email: loginResponse.data.user.email,
          role: loginResponse.data.user.role,
          picture: 'https://via.placeholder.com/100/4285f4/ffffff?text=MT',
          givenName: 'Mobile',
          familyName: 'Test',
          verified: true,
        };

        // Store mock tokens
        await secureStorage.setItem('mobile_auth_token', 'mobile-test-token-' + Date.now());

        // Update auth store and wait for completion
        console.log('🔄 Updating auth store with user data...');
        login(user);
        
        // Wait a moment for the store to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setError(null);
        
        console.log('✅ Mobile user authenticated and logged in');
      } else {
        const errorMessage = loginResponse.error || 'Backend mobile login failed - no user data received';
        console.error('❌ Mobile login failed:', errorMessage);
        throw new Error(errorMessage);
      }

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : '모바일 로그인에 실패했습니다.';
      
      setError(errorMessage);
      console.error('❌ Mobile Sign-In Error:', err);
      throw err; // Re-throw so the component can handle it
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [login, setLoading]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚪 Starting mobile sign-out...');

      // Step 1: Unregister push token from backend BEFORE logout (while session is still valid)
      try {
        console.log('🔔 Unregistering push token before logout...');
        await notificationService.unregisterWithBackend();
        console.log('✅ Push token unregistered successfully');
      } catch (pushError) {
        console.warn('⚠️ Failed to unregister push token (continuing with logout):', pushError);
      }

      // Step 2: Notify backend about logout
      const logoutResponse = await apiService.logout();
      
      if (logoutResponse.success) {
        console.log('✅ Backend logout successful');
      } else {
        console.warn('⚠️ Backend logout failed:', logoutResponse.error);
      }

      // Step 3: Clear local tokens and state
      await secureStorage.removeItem('mobile_auth_token');
      
      // Note: auth store logout() will call notificationService.clearToken()
      logout();
      console.log('✅ Mobile logout successful');

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : '로그아웃에 실패했습니다.';
      
      setError(errorMessage);
      console.error('❌ Sign-Out Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  return {
    signIn,
    signOut,
    isLoading,
    error,
  };
}