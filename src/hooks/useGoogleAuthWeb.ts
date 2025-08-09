import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType } from 'expo-auth-session';
import { useAuthStore } from '@/stores/auth-store';
import { secureStorage } from '@/lib/storage';
import { apiService } from '@/services/api';

WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, logout, setLoading } = useAuthStore();

  // Use your existing web client ID with proper redirect URI
  const redirectUri = makeRedirectUri({ useProxy: true });
  
  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      additionalParameters: {},
      extraParams: {
        include_granted_scopes: 'true',
        access_type: 'offline',
      },
    },
    discovery
  );

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);

      console.log('🚀 Starting Google Web Auth...');
      console.log('📍 Redirect URI:', redirectUri);

      if (!request) {
        throw new Error('Auth request not ready');
      }

      const result = await promptAsync();
      
      if (result.type === 'success') {
        console.log('✅ OAuth successful, exchanging code for tokens...');
        
        if (!result.params.code) {
          throw new Error('No authorization code received');
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB!,
            code: result.params.code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Token exchange failed');
        }

        const tokens = await tokenResponse.json();
        console.log('📤 Sending ID token to backend...');

        // Send ID token to backend
        const verifyResponse = await apiService.verifyGoogleToken(tokens.id_token);

        if (verifyResponse.success) {
          console.log('✅ Backend verification successful:', verifyResponse.data.user);
          
          const user = {
            id: verifyResponse.data.user.id.toString(),
            username: verifyResponse.data.user.username,
            email: verifyResponse.data.user.email,
            picture: undefined,
            givenName: undefined,
            familyName: undefined,
            verified: true,
          };

          await secureStorage.setItem('google_access_token', tokens.access_token);
          await secureStorage.setItem('google_id_token', tokens.id_token);

          login(user);
          setError(null);
          
          console.log('✅ User authenticated successfully');
        } else {
          throw new Error(verifyResponse.error || 'Backend verification failed');
        }
        
      } else if (result.type === 'error') {
        throw new Error(`OAuth error: ${result.params?.error_description || result.error?.message}`);
      } else {
        throw new Error('Authentication was cancelled');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
      setError(errorMessage);
      console.error('❌ Google Sign-In Error:', err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [request, promptAsync, redirectUri, login, setLoading]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚪 Starting sign-out process...');

      const logoutResponse = await apiService.logout();
      
      if (logoutResponse.success) {
        console.log('✅ Backend logout successful');
      } else {
        console.warn('⚠️ Backend logout failed:', logoutResponse.error);
      }

      await Promise.all([
        secureStorage.removeItem('google_access_token'),
        secureStorage.removeItem('google_id_token'),
      ]);
      
      logout();
      console.log('✅ Local logout successful');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
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