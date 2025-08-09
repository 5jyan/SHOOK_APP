import { useState, useCallback, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '@/stores/auth-store';
import { secureStorage } from '@/lib/storage';
import { apiService } from '@/services/api';

import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  verified_email: boolean;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, logout, setLoading } = useAuthStore();

  // Use Expo's Google provider for real OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse();
    } else if (response?.type === 'error') {
      setError('Google 로그인에 실패했습니다.');
      setIsLoading(false);
      setLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async () => {
    try {
      console.log('✅ Google OAuth successful, processing response...');

      if (!response?.authentication?.idToken) {
        throw new Error('ID 토큰을 받지 못했습니다.');
      }

      const idToken = response.authentication.idToken;
      console.log('📤 Sending ID token to backend for verification...');

      // Send ID token to your backend for verification
      const verifyResponse = await apiService.verifyGoogleToken(idToken);

      if (verifyResponse.success) {
        console.log('✅ Backend verification successful:', verifyResponse.data.user);
        
        // Transform backend user to mobile app user format
        const user = {
          id: verifyResponse.data.user.id.toString(),
          username: verifyResponse.data.user.username,
          email: verifyResponse.data.user.email,
          picture: undefined, // Backend doesn't store picture
          givenName: undefined,
          familyName: undefined,
          verified: true,
        };

        // Store authentication info
        if (response.authentication.accessToken) {
          await secureStorage.setItem('google_access_token', response.authentication.accessToken);
        }
        await secureStorage.setItem('google_id_token', idToken);

        // Update auth store
        login(user);
        setError(null);
        
        console.log('✅ User authenticated and logged in:', user);
      } else {
        throw new Error(verifyResponse.error || 'Backend verification failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Google 로그인에 실패했습니다.';
      
      setError(errorMessage);
      console.error('❌ Google Sign-In Error:', err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);

      console.log('🚀 Starting Google Sign-In process...');

      if (!request) {
        throw new Error('Google Auth가 초기화되지 않았습니다.');
      }

      // Start Google OAuth flow
      console.log('📱 Opening Google OAuth...');
      await promptAsync();
      
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Google 로그인에 실패했습니다.';
      
      setError(errorMessage);
      console.error('❌ Sign-In Error:', err);
      setIsLoading(false);
      setLoading(false);
    }
  }, [request, promptAsync, setLoading]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚪 Starting sign-out process...');

      // Notify backend about logout
      console.log('📤 Notifying backend about logout...');
      const logoutResponse = await apiService.logout();
      
      if (logoutResponse.success) {
        console.log('✅ Backend logout successful');
      } else {
        console.warn('⚠️ Backend logout failed:', logoutResponse.error);
      }

      // Clear stored tokens regardless of backend response
      await Promise.all([
        secureStorage.removeItem('google_access_token'),
        secureStorage.removeItem('google_id_token'),
        secureStorage.removeItem('google_refresh_token'),
      ]);
      
      // Update auth store
      logout();

      console.log('✅ Local logout successful');

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