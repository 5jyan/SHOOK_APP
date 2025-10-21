// API service for backend communication
import { decodeVideoHtmlEntities } from '@/utils/html-decode';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiLogger, configLogger } from '@/utils/logger-enhanced';
import httpClient from '@/utils/http-client';

// 플랫폼별 로컬 API URL 결정
const getLocalApiUrl = (localUrls: any) => {
  if (typeof localUrls === 'string') {
    return localUrls;
  }
  
  if (typeof localUrls === 'object') {
    if (Platform.OS === 'android') {
      return localUrls.android || localUrls.default;
    } else if (Platform.OS === 'ios') {
      return localUrls.ios || localUrls.default;
    } else if (Platform.OS === 'web') {
      return localUrls.web || localUrls.default;
    }
    return localUrls.default;
  }
  
  return 'http://localhost:3000';
};

// app.config.js에서 설정한 환경별 API URL 사용
const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
const API_BASE_URL = getLocalApiUrl(configApiUrl) || 'http://localhost:3000';

// API 설정 로그
configLogger.info('API service configuration', {
  platform: Platform.OS,
  configApiUrl,
  API_BASE_URL,
  hasExtraConfig: !!Constants.expoConfig?.extra
});

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

interface KakaoVerifyResponse {
  user: {
    id: number;
    username: string;
    email: string | null;
    kakaoId: string;
    authProvider: string;
    role: 'user' | 'tester' | 'manager';
    createdAt: string;
  };
}

interface YoutubeChannel {
  channelId: string;
  handle: string;
  title: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: number;  // Fixed: should be number to match backend
  videoCount?: number;      // Fixed: should be number to match backend
  isActive?: boolean;
  lastRssError?: string | null;
  lastRssErrorAt?: string | null;
}

// Backend actually returns this structure
interface BackendUserChannel extends YoutubeChannel {
  subscriptionId: number;
  subscribedAt: string | null;
}

// Our app's expected structure
interface UserChannel {
  id: number;
  userId: number;
  channelId: string;
  createdAt: string;
  youtubeChannel: YoutubeChannel;
}

// Video summary types based on backend API spec
interface VideoSummary {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string; // ISO 8601 date-time
  summary: string | null;
  transcript: string | null;
  processed: boolean;
  errorMessage: string | null;
  createdAt: string; // ISO 8601 date-time
  channelTitle: string; // Channel name from JOIN with youtube_channels table
  channelThumbnail?: string; // Channel thumbnail URL from backend
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      // HTTP 클라이언트를 통해 자동 로깅과 함께 요청 수행
      const response = await httpClient.fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Enable session cookies
        ...options,
        // Internal API이므로 상세한 응답 바디 로깅은 비활성화
        logResponseBody: false,
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}...`);
        }
        
        // Special handling for logout endpoint that returns plain text "OK"
        if (endpoint === '/api/logout' && text.trim() === 'OK') {
          data = { success: true };
        } else {
          // Try to parse as JSON anyway
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
          }
        }
      }

      if (!response.ok) {
        apiLogger.warn('API Error Response', { 
          endpoint, 
          status: response.status, 
          statusText: response.statusText,
          error: data?.error || data?.message 
        });
        throw new Error(data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle backend responses that already have success/data structure
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return {
          data: data.data,
          success: data.success,
          error: data.error,
        };
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      // 로그인 실패 같은 예상 가능한 에러는 로그를 출력하지 않음 (프로덕션에서 사용자에게 노출되면 안됨)
      const isAuthError = endpoint.includes('/auth/') || endpoint.includes('/login');

      if (!isAuthError) {
        // 인증 관련이 아닌 예상치 못한 에러만 로그 출력
        apiLogger.error('API Request failed', {
          endpoint,
          method: options.method || 'GET',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        data: {} as T,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async createGuestAccount(deviceId: string): Promise<{
    id: number;
    email: string | null;
    username: string;
    role: 'user' | 'tester' | 'manager';
    isGuest: boolean;
  }> {
    apiLogger.info('Creating guest account', { deviceId: deviceId.substring(0, 8) + '...' });

    const response = await this.makeRequest<{
      user: {
        id: number;
        email: string | null;
        username: string;
        role: 'user' | 'tester' | 'manager';
        isGuest: boolean;
      }
    }>(
      '/api/auth/guest',
      {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Guest account creation failed');
    }

    return response.data.user;
  }

  async verifyKakaoToken(accessToken: string, convertGuestAccount: boolean = false): Promise<{
    id: number;
    email: string | null;
    name: string;
    username: string;
    role: 'user' | 'tester' | 'manager';
    isGuest: boolean;
  }> {
    apiLogger.info('Verifying Kakao token with backend', { convertGuestAccount });

    const response = await this.makeRequest<{
      user: {
        id: number;
        email: string | null;
        name: string;
        username: string;
        role: 'user' | 'tester' | 'manager';
        isGuest: boolean;
      }
    }>(
      '/api/auth/kakao/verify',
      {
        method: 'POST',
        body: JSON.stringify({ accessToken, convertGuestAccount }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Kakao token verification failed');
    }

    return response.data.user;
  }

  async signup(username: string, password: string): Promise<{
    id: number;
    email: string | null;
    username: string;
    role: 'user' | 'tester' | 'manager';
  }> {
    apiLogger.info('Signing up new user', { username });

    const response = await this.makeRequest<{
      id: number;
      email: string | null;
      username: string;
      role: 'user' | 'tester' | 'manager';
    }>(
      '/api/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || '회원가입에 실패했습니다.');
    }

    return response.data;
  }

  async loginWithEmail(username: string, password: string): Promise<{
    id: number;
    email: string | null;
    username: string;
    role: 'user' | 'tester' | 'manager';
  }> {
    apiLogger.info('Logging in with username/password');

    const response = await this.makeRequest<{
      user: {
        id: number;
        email: string | null;
        username: string;
        role: 'user' | 'tester' | 'manager';
      }
    }>(
      '/api/auth/email/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || '로그인에 실패했습니다.');
    }

    return response.data.user;
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('/api/logout', {
      method: 'POST',
    });
  }

  async deleteAccount(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    apiLogger.info('Deleting user account');
    return this.makeRequest<{ success: boolean; message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<KakaoVerifyResponse['user']>> {
    return this.makeRequest<KakaoVerifyResponse['user']>('/api/user');
  }

  // Get user's subscribed channels
  async getChannelVideos(userId: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/api/channel-videos/${userId}`);
  }

  // Test endpoint to check backend connectivity
  async healthCheck(): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/api/user', {
      method: 'GET',
    });
  }

  // Channel-related endpoints
  async searchChannels(query: string): Promise<ApiResponse<YoutubeChannel[]>> {
    return this.makeRequest<YoutubeChannel[]>(`/api/channels/search?query=${encodeURIComponent(query)}`);
  }

  async getUserChannels(userId: number): Promise<ApiResponse<UserChannel[]>> {
    const response = await this.makeRequest<BackendUserChannel[]>(`/api/channels/${userId}`);
    
    if (response.success && response.data) {
      // Transform backend data structure to what our app expects
      const transformedChannels: UserChannel[] = response.data.map((backendChannel) => ({
        id: backendChannel.subscriptionId,
        userId: userId,
        channelId: backendChannel.channelId,
        createdAt: backendChannel.subscribedAt || new Date().toISOString(),
        youtubeChannel: {
          channelId: backendChannel.channelId,
          handle: backendChannel.handle,
          title: backendChannel.title,
          description: backendChannel.description,
          thumbnail: backendChannel.thumbnail,
          subscriberCount: backendChannel.subscriberCount,
          videoCount: backendChannel.videoCount,
          isActive: backendChannel.isActive,
          lastRssError: backendChannel.lastRssError,
          lastRssErrorAt: backendChannel.lastRssErrorAt,
        }
      }));
      
      return {
        ...response,
        data: transformedChannels
      };
    }
    
    return response as ApiResponse<UserChannel[]>;
  }

  async addChannel(channelId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.makeRequest<{ success: boolean; message?: string }>('/api/channels', {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  async deleteChannel(channelId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>(`/api/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  // Video summaries endpoint - GET /api/videos
  async getVideoSummaries(since?: number): Promise<ApiResponse<VideoSummary[]>> {
    // Apply 30-day filter to limit cache size and focus on recent content
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const effectiveSince = since ? Math.max(since, thirtyDaysAgo) : thirtyDaysAgo;

    const endpoint = `/api/videos?since=${effectiveSince}`;
    
    const syncType = since ? 'incremental' : 'full';
    apiLogger.info(`Starting video summaries sync: ${syncType} (30-day filtered)`, {
      originalSince: since ? new Date(since).toISOString() : null,
      effectiveSince: new Date(effectiveSince).toISOString(),
      thirtyDayLimit: new Date(thirtyDaysAgo).toISOString(),
      endpoint,
      syncType
    });
    
    const result = await this.makeRequest<VideoSummary[]>(endpoint);
    
    // Apply HTML entity decoding to video titles and summaries (redundant safety check)
    if (result.success && result.data) {
      apiLogger.debug('Applying HTML entity decoding to video data', {
        videoCount: result.data.length
      });
      result.data = decodeVideoHtmlEntities(result.data);
    }
    
    apiLogger.info(`Video summaries sync completed: ${syncType}`, {
      success: result.success,
      videoCount: result.data?.length || 0,
      syncType,
      hasError: !!result.error
    });
    
    return result;
  }

  // Push notification endpoints
  async registerPushToken(tokenData: PushTokenData): Promise<ApiResponse<RegisterPushTokenResponse>> {
    apiLogger.info('Registering push token', {
      deviceId: tokenData.deviceId,
      platform: tokenData.platform,
      appVersion: tokenData.appVersion,
      tokenPreview: tokenData.token.substring(0, 20) + '...'
    });
    
    return this.makeRequest<RegisterPushTokenResponse>('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });
  }

  async unregisterPushToken(deviceId: string): Promise<ApiResponse<RegisterPushTokenResponse>> {
    apiLogger.info('Unregistering push token', { deviceId });
    
    // Try multiple endpoints to ensure unregistration
    const endpoints = [
      `/api/push-tokens/${deviceId}`,
      `/api/push/unregister`,
    ];
    
    let lastResult: ApiResponse<RegisterPushTokenResponse> | null = null;
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.makeRequest<RegisterPushTokenResponse>(endpoint, {
          method: endpoint.includes('/unregister') ? 'POST' : 'DELETE',
          ...(endpoint.includes('/unregister') ? {
            body: JSON.stringify({ deviceId })
          } : {})
        });
        
        apiLogger.info(`Unregister attempt on ${endpoint}`, {
          deviceId,
          success: result.success,
          status: result.status,
          error: result.error,
          data: result.data
        });
        
        lastResult = result;
        
        if (result.success) {
          apiLogger.info('Successfully unregistered via endpoint', { endpoint });
          break;
        }
      } catch (error) {
        apiLogger.warn(`Failed to unregister via ${endpoint}`, {
          deviceId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return lastResult || { success: false, error: 'All unregister attempts failed' };
  }

  async updatePushToken(tokenData: PushTokenData): Promise<ApiResponse<RegisterPushTokenResponse>> {
    apiLogger.info('Updating push token', {
      deviceId: tokenData.deviceId,
      platform: tokenData.platform,
      tokenPreview: tokenData.token.substring(0, 20) + '...'
    });
    
    return this.makeRequest<RegisterPushTokenResponse>(`/api/push-tokens/${tokenData.deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(tokenData),
    });
  }

  async sendTestPushNotification(): Promise<ApiResponse<RegisterPushTokenResponse>> {
    apiLogger.info('Sending test push notification');
    
    return this.makeRequest<RegisterPushTokenResponse>('/api/push-tokens/test', {
      method: 'POST',
    });
  }

  async getPushTokenStatus(): Promise<ApiResponse<PushTokenInfo[]>> {
    apiLogger.info('Fetching user push token status from DB');
    
    return this.makeRequest<PushTokenInfo[]>('/api/push-tokens', {
      method: 'GET',
    });
  }

  // Manual monitoring trigger endpoint
  async triggerManualMonitoring(): Promise<ApiResponse<{ success: boolean; message: string; timestamp: string }>> {
    apiLogger.info('Triggering manual YouTube monitoring');
    
    return this.makeRequest<{ success: boolean; message: string; timestamp: string }>('/api/admin/trigger-monitoring', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();

// API 서비스 초기화 완료 로그
configLogger.info('API Service initialized', {
  baseUrl: API_BASE_URL,
  platform: Platform.OS,
  hasCredentials: true
});

// Push notification interfaces
interface PushTokenData {
  token: string;
  deviceId: string;
  platform: string;
  appVersion: string;
}

interface RegisterPushTokenResponse {
  success: boolean;
  message?: string;
}

interface PushTokenInfo {
  id: number;
  deviceId: string;
  platform: string;
  appVersion: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tokenPrefix: string;
}

// Export interfaces for use in other files
export type { BackendUserChannel, UserChannel, VideoSummary, YoutubeChannel, PushTokenData, RegisterPushTokenResponse, PushTokenInfo };
