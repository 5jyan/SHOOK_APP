import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { secureStorage } from '@/lib/storage';
import { authLogger } from '../utils/logger-enhanced';

WebBrowser.maybeCompleteAuthSession();

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  verified_email: boolean;
}

class GoogleAuthService {
  private request: Google.GoogleAuthRequest | null = null;
  private response: Google.GoogleAuthResponse | null = null;
  
  private getClientId(): string {
    const clientId = Platform.select({
      ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID, 
      web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      default: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    });

    if (!clientId) {
      throw new Error('Google Client ID not configured for this platform');
    }

    return clientId;
  }

  async initialize() {
    if (this.request) return;

    // Note: This service is deprecated and should not be used.
    // Google.useAuthRequest is a React Hook and cannot be called in class components.
    // Use the hook-based approach in useGoogleAuth.ts instead.
    throw new Error('GoogleAuthSimpleService is deprecated. Use useGoogleAuth hook instead.');
  }

  async signIn(): Promise<GoogleUser> {
    try {
      if (!this.request) {
        await this.initialize();
      }

      if (!this.request) {
        throw new Error('Failed to initialize Google Auth');
      }

      const result = await this.request.promptAsync();
      
      if (result.type !== 'success') {
        throw new Error('Authentication was cancelled or failed');
      }

      // Get user info using access token
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${result.authentication?.accessToken}`
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const user: GoogleUser = await userInfoResponse.json();

      // Store token securely
      if (result.authentication?.accessToken) {
        await secureStorage.setItem('google_access_token', result.authentication.accessToken);
        
        if (result.authentication.refreshToken) {
          await secureStorage.setItem('google_refresh_token', result.authentication.refreshToken);
        }
      }

      return user;
    } catch (error) {
      authLogger.error('Google Sign-In failed in deprecated service', {
        error: error instanceof Error ? error.message : String(error),
        platform: Platform.OS,
        service: 'GoogleAuthSimpleService',
        deprecated: true
      });
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Google 로그인에 실패했습니다. 다시 시도해주세요.'
      );
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await secureStorage.getItem('google_access_token');
      return accessToken;
    } catch (error) {
      authLogger.error('Failed to get access token in deprecated service', {
        error: error instanceof Error ? error.message : String(error),
        service: 'GoogleAuthSimpleService',
        deprecated: true
      });
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await Promise.all([
        secureStorage.removeItem('google_access_token'),
        secureStorage.removeItem('google_refresh_token'),
      ]);
    } catch (error) {
      authLogger.error('Sign out failed in deprecated service', {
        error: error instanceof Error ? error.message : String(error),
        service: 'GoogleAuthSimpleService',
        deprecated: true
      });
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (!accessToken) {
        return null;
      }

      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch (error) {
      authLogger.error('Failed to get current user in deprecated service', {
        error: error instanceof Error ? error.message : String(error),
        service: 'GoogleAuthSimpleService',
        deprecated: true
      });
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();