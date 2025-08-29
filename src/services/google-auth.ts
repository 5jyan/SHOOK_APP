import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { secureStorage } from '@/lib/storage';
import { authLogger } from '../utils/logger-enhanced';

// Ensure WebBrowser is warmed up for better UX
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

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

class GoogleAuthService {
  private readonly scopes = ['openid', 'profile', 'email'];
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly useProxy = Platform.select({ web: false, default: true });

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

  private getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: process.env.EXPO_PUBLIC_APP_SCHEME,
      useProxy: this.useProxy,
    });
  }

  async signIn(): Promise<GoogleUser> {
    try {
      const redirectUri = this.getRedirectUri();
      const clientId = this.getClientId();

      // Create auth request (simplified without PKCE for now)
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: this.scopes,
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        additionalParameters: {
          access_type: 'offline', // Get refresh token
          prompt: 'consent', // Force consent screen to get refresh token
        },
      });

      // Start auth session
      const result = await request.promptAsync({
        authorizationEndpoint: this.authUrl,
        useProxy: this.useProxy,
        showInRecents: true,
      });

      if (result.type !== 'success') {
        throw new Error('Authentication was cancelled or failed');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(
        result.params.code,
        redirectUri
      );

      // Get user profile
      const user = await this.getUserProfile(tokenResponse.access_token);

      // Store tokens securely
      await this.storeTokens(tokenResponse);

      return user;
    } catch (error) {
      authLogger.error('Google Sign-In failed', {
        error: error instanceof Error ? error.message : String(error),
        platform: Platform.OS,
        clientId: this.getClientId().slice(0, 10) + '...',
        scopes: this.scopes
      });
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Google 로그인에 실패했습니다. 다시 시도해주세요.'
      );
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<GoogleTokenResponse> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.getClientId(),
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    return response.json();
  }

  private async getUserProfile(accessToken: string): Promise<GoogleUser> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  }

  private async storeTokens(tokens: GoogleTokenResponse): Promise<void> {
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    
    await Promise.all([
      secureStorage.setItem('google_access_token', tokens.access_token),
      secureStorage.setItem('google_expires_at', expiresAt.toString()),
      tokens.refresh_token && 
        secureStorage.setItem('google_refresh_token', tokens.refresh_token),
      tokens.id_token && 
        secureStorage.setItem('google_id_token', tokens.id_token),
    ]);
  }

  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await secureStorage.getItem('google_access_token');
      const expiresAt = await secureStorage.getItem('google_expires_at');

      if (!accessToken || !expiresAt) {
        return null;
      }

      // Check if token is expired
      if (Date.now() >= parseInt(expiresAt)) {
        // Try to refresh token
        return this.refreshToken();
      }

      return accessToken;
    } catch (error) {
      authLogger.error('Failed to get valid access token', {
        error: error instanceof Error ? error.message : String(error),
        hasAccessToken: !!(await secureStorage.getItem('google_access_token')),
        hasExpiresAt: !!(await secureStorage.getItem('google_expires_at'))
      });
      return null;
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await secureStorage.getItem('google_refresh_token');
      
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.getClientId(),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens
        await this.signOut();
        return null;
      }

      const tokenResponse = await response.json();
      await this.storeTokens(tokenResponse);

      return tokenResponse.access_token;
    } catch (error) {
      authLogger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        hasRefreshToken: !!(await secureStorage.getItem('google_refresh_token'))
      });
      await this.signOut();
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await Promise.all([
        secureStorage.removeItem('google_access_token'),
        secureStorage.removeItem('google_refresh_token'),
        secureStorage.removeItem('google_id_token'),
        secureStorage.removeItem('google_expires_at'),
      ]);
    } catch (error) {
      authLogger.error('Sign out failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (!accessToken) {
        return null;
      }

      return this.getUserProfile(accessToken);
    } catch (error) {
      authLogger.error('Failed to get current user', {
        error: error instanceof Error ? error.message : String(error),
        hasValidToken: !!(await this.getValidAccessToken())
      });
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();