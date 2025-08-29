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

interface GoogleVerifyRequest {
  token: string; // Google ID token
}

interface GoogleVerifyResponse {
  user: {
    id: number;
    username: string;
    email: string;
    googleId: string;
    authProvider: string;
    role: 'user' | 'tester' | 'manager';
    slackUserId?: string;
    slackChannelId?: string;
    slackEmail?: string;
    createdAt: string;
  };
}

interface YoutubeChannel {
  channelId: string;
  handle: string;
  title: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
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

      return {
        data,
        success: true,
      };
    } catch (error) {
      apiLogger.error('API Request failed', {
        endpoint,
        method: options.method || 'GET',
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        data: {} as T,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async verifyGoogleToken(token: string): Promise<ApiResponse<GoogleVerifyResponse>> {
    return this.makeRequest<GoogleVerifyResponse>('/api/auth/google/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Temporary mobile login endpoint
  async mobileLogin(email: string, username: string): Promise<ApiResponse<GoogleVerifyResponse>> {
    return this.makeRequest<GoogleVerifyResponse>('/api/auth/google/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('/api/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<GoogleVerifyResponse['user']>> {
    return this.makeRequest<GoogleVerifyResponse['user']>('/api/user');
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
    const endpoint = since ? `/api/videos?since=${since}` : '/api/videos';
    
    const syncType = since ? 'incremental' : 'full';
    apiLogger.info(`Starting video summaries sync: ${syncType}`, {
      since: since ? new Date(since).toISOString() : null,
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
    
    return this.makeRequest<RegisterPushTokenResponse>(`/api/push-tokens/${deviceId}`, {
      method: 'DELETE',
    });
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

// Export interfaces for use in other files
export type { BackendUserChannel, UserChannel, VideoSummary, YoutubeChannel, PushTokenData, RegisterPushTokenResponse };
