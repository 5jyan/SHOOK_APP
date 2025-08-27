import { useState, useCallback } from 'react';
import { login, logout, getProfile } from '@react-native-seoul/kakao-login';
import { useAuthStore } from '@/stores/auth-store';

interface KakaoProfile {
  id: string;
  nickname?: string;
  profileImageUrl?: string;
  email?: string;
}

interface KakaoUserData {
  id: string;
  username: string;
  email?: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
  verified?: boolean;
  role?: 'user' | 'tester' | 'manager';
  // Kakao-specific fields with kakao_ prefix
  kakao_id: string;
  kakao_nickname?: string;
  kakao_profile_image?: string;
  kakao_email?: string;
}

export function useKakaoAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authStore = useAuthStore();

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🟡 Starting Kakao login process...');

      // 1. 카카오 로그인
      const token = await login();
      console.log('✅ Kakao token received:', { 
        accessToken: token.accessToken?.substring(0, 20) + '...', 
        refreshToken: token.refreshToken ? 'present' : 'null' 
      });
      
      // 2. 사용자 프로필 조회
      const profile = await getProfile();
      console.log('👤 Kakao profile received:', {
        id: profile.id,
        nickname: profile.nickname,
        hasEmail: !!profile.email,
        hasProfileImage: !!profile.profileImageUrl
      });
      
      // 3. 사용자 데이터 변환 (백엔드 API 연동 전까지 임시)
      const userData: KakaoUserData = {
        id: `kakao_${profile.id}`,
        username: profile.nickname || `카카오사용자_${profile.id}`,
        email: profile.email,
        picture: profile.profileImageUrl,
        givenName: profile.nickname,
        verified: true,
        role: 'user',
        // Kakao-specific data
        kakao_id: profile.id,
        kakao_nickname: profile.nickname,
        kakao_profile_image: profile.profileImageUrl,
        kakao_email: profile.email,
      };
      
      // 4. 인증 상태 업데이트
      console.log('🔄 Updating auth state with Kakao user data');
      authStore.login(userData);
      
      console.log('✅ Kakao authentication completed successfully');
      
    } catch (error) {
      console.error('❌ Kakao authentication failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '카카오 로그인에 실패했습니다.';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authStore]);

  const signOut = useCallback(async () => {
    try {
      console.log('🟡 Starting Kakao logout process...');
      
      // 1. 카카오 로그아웃
      await logout();
      console.log('✅ Kakao logout completed');
      
      // 2. 로컬 인증 상태 정리
      authStore.logout();
      console.log('✅ Local auth state cleared');
      
    } catch (error) {
      console.error('❌ Kakao logout failed:', error);
      // 로그아웃 실패해도 로컬 상태는 정리
      authStore.logout();
    }
  }, [authStore]);

  return {
    signIn,
    signOut,
    isLoading,
    error,
  };
}