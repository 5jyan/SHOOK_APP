import { useState, useCallback } from 'react';
import { googleAuthService } from '@/services/google-auth';
import { useAuthStore } from '@/stores/auth-store';

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

      // Perform Google Sign-In
      const googleUser = await googleAuthService.signIn();

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

      // TODO: Send user data to your backend API
      // await api.post('/auth/google', { user, tokens });

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Google 로그인에 실패했습니다.';
      
      setError(errorMessage);
      console.error('Google Sign-In Error:', err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [login, setLoading]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Clear Google tokens
      await googleAuthService.signOut();
      
      // Update auth store
      logout();

      // TODO: Call backend logout endpoint if needed
      // await api.post('/auth/logout');

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : '로그아웃에 실패했습니다.';
      
      setError(errorMessage);
      console.error('Sign-Out Error:', err);
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