import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { secureStorage } from '@/lib/storage';

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

    const clientId = this.getClientId();
    
    const [request, response] = Google.useAuthRequest({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      scopes: ['openid', 'profile', 'email'],
    });
    
    this.request = request;
    this.response = response;
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
      console.error('Google Sign-In Error:', error);
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
      console.error('Error getting access token:', error);
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
      console.error('Sign out error:', error);
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
      console.error('Get current user error:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();