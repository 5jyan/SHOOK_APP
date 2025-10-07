import { login, logout } from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';
import { authLogger } from '../utils/logger-enhanced';

interface KakaoUser {
  id: string;
  email: string | null;
  name: string;
  profileImage: string | null;
}

interface KakaoLoginResult {
  user: KakaoUser;
  accessToken: string;
}

class KakaoAuthService {
  async signIn(): Promise<KakaoLoginResult> {
    try {
      authLogger.info('Starting Kakao login flow');

      // 카카오 로그인 (카카오톡 앱 우선, 없으면 웹뷰)
      const token = await login();

      authLogger.info('Kakao login successful', {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        tokenKeys: Object.keys(token),
      });

      // 토큰 안전하게 저장
      try {
        await this.storeTokens({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken || null,
          expiresAt: token.expiresAt ? new Date(token.expiresAt) : null,
        });
      } catch (storageError) {
        authLogger.error('Failed to store Kakao tokens', {
          error: storageError instanceof Error ? storageError.message : String(storageError),
        });
        // Continue anyway - storage is not critical for login
      }

      // 토큰에서 사용자 정보 추출 (카카오 API로 프로필 가져오기)
      const userInfo = await this.getUserInfoFromToken(token.accessToken);

      authLogger.info('Kakao user info fetched', {
        userId: userInfo.id,
        hasEmail: !!userInfo.email,
      });

      const user: KakaoUser = {
        id: userInfo.id,
        email: userInfo.email || null,
        name: userInfo.name || '카카오 사용자',
        profileImage: userInfo.profileImage || null,
      };

      return {
        user,
        accessToken: token.accessToken,
      };
    } catch (error) {
      authLogger.error('Kakao Sign-In failed', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });

      throw new Error(
        error instanceof Error
          ? error.message
          : '카카오 로그인에 실패했습니다. 다시 시도해주세요.'
      );
    }
  }

  private async getUserInfoFromToken(accessToken: string): Promise<{
    id: string;
    email: string | null;
    name: string | null;
    profileImage: string | null;
  }> {
    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Kakao API');
      }

      const data = await response.json();

      return {
        id: data.id.toString(),
        email: data.kakao_account?.email || null,
        name: data.properties?.nickname || null,
        profileImage: data.properties?.profile_image || data.properties?.thumbnail_image || null,
      };
    } catch (error) {
      authLogger.error('Failed to fetch user info from Kakao API', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      authLogger.info('Starting Kakao logout');

      // 카카오 SDK 로그아웃
      await logout();

      // 저장된 토큰 삭제
      await Promise.all([
        SecureStore.deleteItemAsync('kakao_access_token'),
        SecureStore.deleteItemAsync('kakao_refresh_token'),
        SecureStore.deleteItemAsync('kakao_expires_at'),
      ]);

      authLogger.info('Kakao logout successful');
    } catch (error) {
      authLogger.error('Kakao sign out failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getCurrentUser(): Promise<KakaoUser | null> {
    try {
      const accessToken = await SecureStore.getItemAsync('kakao_access_token');

      if (!accessToken) {
        authLogger.info('No Kakao access token found');
        return null;
      }

      // 토큰으로 프로필 가져오기
      const userInfo = await this.getUserInfoFromToken(accessToken);

      authLogger.info('Kakao current user fetched', {
        userId: userInfo.id,
      });

      return {
        id: userInfo.id,
        email: userInfo.email || null,
        name: userInfo.name || '카카오 사용자',
        profileImage: userInfo.profileImage || null,
      };
    } catch (error) {
      authLogger.error('Failed to get current Kakao user', {
        error: error instanceof Error ? error.message : String(error),
      });

      // 토큰이 만료되었거나 유효하지 않은 경우 삭제
      await this.signOut();
      return null;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await SecureStore.getItemAsync('kakao_access_token');
      const expiresAt = await SecureStore.getItemAsync('kakao_expires_at');

      if (!accessToken) {
        return null;
      }

      // 만료 시간 확인
      if (expiresAt && Date.now() >= parseInt(expiresAt)) {
        authLogger.info('Kakao token expired, need re-authentication');
        await this.signOut();
        return null;
      }

      return accessToken;
    } catch (error) {
      authLogger.error('Failed to get valid Kakao access token', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async storeTokens(tokens: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }): Promise<void> {
    const promises = [
      SecureStore.setItemAsync('kakao_access_token', tokens.accessToken),
    ];

    if (tokens.refreshToken) {
      promises.push(
        SecureStore.setItemAsync('kakao_refresh_token', tokens.refreshToken)
      );
    }

    if (tokens.expiresAt) {
      promises.push(
        SecureStore.setItemAsync('kakao_expires_at', tokens.expiresAt.getTime().toString())
      );
    }

    await Promise.all(promises);

    authLogger.info('Kakao tokens stored securely', {
      hasRefreshToken: !!tokens.refreshToken,
      hasExpiresAt: !!tokens.expiresAt,
    });
  }
}

export const kakaoAuthService = new KakaoAuthService();
