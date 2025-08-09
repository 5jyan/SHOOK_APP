// API service for backend communication
import { secureStorage } from '@/lib/storage';

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
    slackUserId?: string;
    slackChannelId?: string;
    slackEmail?: string;
    createdAt: string;
  };
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
      
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
        
        // Try to parse as JSON anyway
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
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
    return this.makeRequest<GoogleVerifyResponse>('/api/auth/mobile/login', {
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
}

export const apiService = new ApiService();