import { useState, useCallback, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '@/stores/auth-store';
import { Platform } from 'react-native';
import { secureStorage } from '@/lib/storage';
import { authLogger } from '@/utils/logger-enhanced';
import { googleApiClient } from '@/utils/http-client';

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

  // Use Expo's Google provider
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: ['profile', 'email'], // 더 간단한 스코프로 테스트
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
      if (!response?.authentication?.accessToken) {
        throw new Error('No access token received');
      }

      // Get user info using access token
      const userInfoResponse = await googleApiClient.fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.authentication.accessToken}`,
        {
          logResponseBody: true // 외부 API이므로 응답 바디 로깅 (민감정보는 자동 마스킹됨)
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const googleUser: GoogleUser = await userInfoResponse.json();

      // Store tokens securely
      await secureStorage.setItem('google_access_token', response.authentication.accessToken);
      
      if (response.authentication.refreshToken) {
        await secureStorage.setItem('google_refresh_token', response.authentication.refreshToken);
      }

      // Transform Google user to our User type
      const user = {
        id: googleUser.id,
        username: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture,
        givenName: googleUser.given_name,
        familyName: googleUser.family_name,
        verified: googleUser.verified_email,
      };

      // Update auth store
      login(user);

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Google 로그인에 실패했습니다.';
      
      setError(errorMessage);
      authLogger.error('❌ Google Sign-In Error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
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

      authLogger.info('🚀 Starting Google Sign-In');
      authLogger.debug('🔧 OAuth Config', {
        hasIosClientId: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
        hasAndroidClientId: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
        requestReady: !!request
      });

      if (!request) {
        throw new Error('Google Auth request not initialized');
      }

      // Prompt for authentication
      authLogger.info('📱 Prompting for Google authentication');
      const result = await promptAsync();
      authLogger.debug('📋 Google Sign-In result', {
        type: result?.type,
        hasError: !!result?.error,
        hasAuthentication: !!(result as any)?.authentication
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Google 로그인에 실패했습니다.';
      
      setError(errorMessage);
      authLogger.error('❌ Google Sign-In Error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setIsLoading(false);
      setLoading(false);
    }
  }, [request, promptAsync, setLoading]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Clear stored tokens
      await Promise.all([
        secureStorage.removeItem('google_access_token'),
        secureStorage.removeItem('google_refresh_token'),
      ]);
      
      // Update auth store
      logout();

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : '로그아웃에 실패했습니다.';
      
      setError(errorMessage);
      authLogger.error('❌ Sign-Out Error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
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