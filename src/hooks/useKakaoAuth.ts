import { useState } from 'react';
import { kakaoAuthService } from '@/services/kakao-auth';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { authLogger } from '@/utils/logger-enhanced';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '@/services/notification';

export function useKakaoAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  const signIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      authLogger.info('Starting Kakao authentication flow');

      // 1. 카카오 로그인
      const { user, accessToken } = await kakaoAuthService.signIn();

      authLogger.info('Kakao login successful, verifying with backend', {
        userId: user.id,
        hasEmail: !!user.email,
      });

      // 2. 백엔드에 토큰 검증 및 세션 생성 요청
      const backendUser = await apiService.verifyKakaoToken(accessToken);

      authLogger.info('Backend verification successful', {
        backendUserId: backendUser.id,
      });

      // 3. 앱 상태에 사용자 정보 저장
      login({
        id: backendUser.id.toString(),
        email: backendUser.email || user.email || '',
        name: backendUser.name || user.name,
        profileImage: user.profileImage,
      });

      // 4. 채널 변경 플래그 초기화 (첫 로그인) - 제거하거나 타임스탬프 0으로 설정
      await AsyncStorage.removeItem('channel_list_changed');

      // 5. 푸시 알림 초기화
      try {
        await notificationService.initialize();
        authLogger.info('Notifications initialized after Kakao login');
      } catch (notifError) {
        authLogger.error('Failed to initialize notifications', {
          error: notifError instanceof Error ? notifError.message : String(notifError),
        });
        // 알림 초기화 실패는 로그인 성공에 영향 없음
      }

      authLogger.info('Kakao authentication flow completed successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';

      authLogger.error('Kakao authentication failed', {
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
      });

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);

      authLogger.info('Starting Kakao sign out');

      // 카카오 SDK 로그아웃
      await kakaoAuthService.signOut();

      authLogger.info('Kakao sign out completed');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '로그아웃에 실패했습니다.';

      authLogger.error('Kakao sign out failed', {
        error: errorMessage,
      });

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    signOut,
    isLoading,
    error,
  };
}
