// API service for backend communication
import { decodeVideoHtmlEntities } from '@/utils/html-decode';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
      
      console.log(`📡 API_BASE_URL: ${API_BASE_URL}`);
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
      console.log(`📡 Request options:`, JSON.stringify(options, null, 2));
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Enable session cookies
        ...options,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);
      console.log(`📡 Response Headers:`, Object.fromEntries(response.headers.entries()));

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log(`📡 Response Data:`, JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.log(`📡 Response Text (first 500 chars):`, text.substring(0, 500));
        
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

      // Log successful responses for debugging
      if (response.ok) {
        console.log(`✅ API Success: ${response.status} for ${endpoint}`);
      }

      if (!response.ok) {
        console.log(`❌ API Error Response: ${response.status} for ${endpoint}`, data);
        throw new Error(data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('❌ API Error:', error);
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
    
    if (since) {
      console.log(`🚀 [apiService.getVideoSummaries] Incremental sync since ${new Date(since).toISOString()}`);
    } else {
      console.log('🚀 [apiService.getVideoSummaries] Full sync requested');
    }
    
    console.log('🚀 [apiService.getVideoSummaries] API_BASE_URL:', API_BASE_URL);
    console.log('🚀 [apiService.getVideoSummaries] Full URL will be:', `${API_BASE_URL}${endpoint}`);
    
    const result = await this.makeRequest<VideoSummary[]>(endpoint);
    
    // Apply HTML entity decoding to video titles and summaries (redundant safety check)
    if (result.success && result.data) {
      console.log('🔄 [apiService.getVideoSummaries] Applying HTML entity decoding to video data');
      result.data = decodeVideoHtmlEntities(result.data);
    }
    
    if (since) {
      console.log(`🚀 [apiService.getVideoSummaries] Incremental sync completed: ${result.data?.length || 0} new videos`);
    } else {
      console.log(`🚀 [apiService.getVideoSummaries] Full sync completed: ${result.data?.length || 0} total videos`);
    }
    
    return result;
  }

  // Push notification endpoints
  async registerPushToken(tokenData: PushTokenData): Promise<ApiResponse<RegisterPushTokenResponse>> {
    console.log('🔔 [apiService.registerPushToken] Registering push token:', tokenData.token.substring(0, 20) + '...');
    
    return this.makeRequest<RegisterPushTokenResponse>('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });
  }

  async unregisterPushToken(deviceId: string): Promise<ApiResponse<RegisterPushTokenResponse>> {
    console.log('🔔 [apiService.unregisterPushToken] Unregistering push token for device:', deviceId);
    
    return this.makeRequest<RegisterPushTokenResponse>(`/api/push-tokens/${deviceId}`, {
      method: 'DELETE',
    });
  }

  async updatePushToken(tokenData: PushTokenData): Promise<ApiResponse<RegisterPushTokenResponse>> {
    console.log('🔔 [apiService.updatePushToken] Updating push token:', tokenData.token.substring(0, 20) + '...');
    
    return this.makeRequest<RegisterPushTokenResponse>(`/api/push-tokens/${tokenData.deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(tokenData),
    });
  }

  async sendTestPushNotification(): Promise<ApiResponse<RegisterPushTokenResponse>> {
    console.log('🔔 [apiService.sendTestPushNotification] Sending test push notification');
    
    return this.makeRequest<RegisterPushTokenResponse>('/api/push-tokens/test', {
      method: 'POST',
    });
  }

  // Manual monitoring trigger endpoint
  async triggerManualMonitoring(): Promise<ApiResponse<{ success: boolean; message: string; timestamp: string }>> {
    console.log('🔄 [apiService.triggerManualMonitoring] Triggering manual YouTube monitoring');
    
    return this.makeRequest<{ success: boolean; message: string; timestamp: string }>('/api/admin/trigger-monitoring', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();

console.log('🚀 [API Service] ApiService instance created');
console.log('🚀 [API Service] API_BASE_URL at module level:', API_BASE_URL);

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
