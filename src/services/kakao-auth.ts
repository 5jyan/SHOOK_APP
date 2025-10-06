import { login, logout, getProfile } from '@react-native-kakao/user';
import type { KakaoProfile } from '@react-native-kakao/user';
import { secureStorage } from '@/lib/storage';
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

      authLogger.info('Kakao login successful, fetching profile', {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
      });

      // 사용자 프로필 가져오기
      const profile = await getProfile();

      authLogger.info('Kakao profile fetched', {
        userId: profile.id,
        hasEmail: !!profile.email,
        hasNickname: !!profile.nickname,
      });

      // 토큰 안전하게 저장
      await this.storeTokens({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken || null,
        expiresAt: token.expiresAt ? new Date(token.expiresAt) : null,
      });

      const user: KakaoUser = {
        id: profile.id,
        email: profile.email || null,
        name: profile.nickname || '카카오 사용자',
        profileImage: profile.profileImageUrl || profile.thumbnailImageUrl || null,
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

  async signOut(): Promise<void> {
    try {
      authLogger.info('Starting Kakao logout');

      // 카카오 SDK 로그아웃
      await logout();

      // 저장된 토큰 삭제
      await Promise.all([
        secureStorage.removeItem('kakao_access_token'),
        secureStorage.removeItem('kakao_refresh_token'),
        secureStorage.removeItem('kakao_expires_at'),
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
      const accessToken = await secureStorage.getItem('kakao_access_token');

      if (!accessToken) {
        authLogger.info('No Kakao access token found');
        return null;
      }

      // 프로필 가져오기 (토큰이 유효하면 성공)
      const profile = await getProfile();

      authLogger.info('Kakao current user fetched', {
        userId: profile.id,
      });

      return {
        id: profile.id,
        email: profile.email || null,
        name: profile.nickname || '카카오 사용자',
        profileImage: profile.profileImageUrl || profile.thumbnailImageUrl || null,
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
      const accessToken = await secureStorage.getItem('kakao_access_token');
      const expiresAt = await secureStorage.getItem('kakao_expires_at');

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
      secureStorage.setItem('kakao_access_token', tokens.accessToken),
    ];

    if (tokens.refreshToken) {
      promises.push(
        secureStorage.setItem('kakao_refresh_token', tokens.refreshToken)
      );
    }

    if (tokens.expiresAt) {
      promises.push(
        secureStorage.setItem('kakao_expires_at', tokens.expiresAt.getTime().toString())
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
