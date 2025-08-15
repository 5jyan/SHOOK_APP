// Notification service for Expo Push Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useNotificationStore } from '@/stores/notification-store';
import { apiService, type PushTokenData } from './api';
import { queryClient } from '@/lib/query-client';

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  deviceId: string;
  platform: string;
  appVersion: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service - call this after user login
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 [NotificationService] Already initialized');
      return;
    }

    useNotificationStore.getState().setRegistering(true);

    try {
      console.log('🔔 [NotificationService] Initializing notification service...');
      
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('🔔 [NotificationService] Push notifications only work on physical devices');
        useNotificationStore.getState().setRegistered(false, 'Push notifications only work on physical devices');
        return;
      }

      // Request permissions
      const permission = await this.requestPermissions();
      if (!permission.granted) {
        console.warn('🔔 [NotificationService] Notification permissions denied');
        useNotificationStore.getState().setRegistered(false, 'Notification permissions denied');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        console.log('🔔 [NotificationService] Successfully initialized with token:', token.substring(0, 20) + '...');
        
        console.log('🔔 [NotificationService] Calling registerWithBackend...');
        // Register with backend
        const success = await this.registerWithBackend();
        console.log('🔔 [NotificationService] registerWithBackend returned:', success);
        useNotificationStore.getState().setRegistered(success);

      } else {
        useNotificationStore.getState().setRegistered(false, 'Could not get push token');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('🔔 [NotificationService] Failed to initialize:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useNotificationStore.getState().setRegistered(false, errorMessage);
    } finally {
      useNotificationStore.getState().setRegistering(false);
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    console.log('🔔 [NotificationService] Requesting notification permissions...');
    
    try {
      // First check existing permissions
      let permissions = await Notifications.getPermissionsAsync();
      console.log('🔔 [NotificationService] Current permissions:', permissions);

      if (!permissions.granted) {
        // Request permissions if not granted
        permissions = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        console.log('🔔 [NotificationService] New permissions:', permissions);
      }

      return permissions;
    } catch (error) {
      console.error('🔔 [NotificationService] Error requesting permissions:', error);
      throw error;
    }
  }

  // Get Expo push token
  async getPushToken(): Promise<string | null> {
    console.log('🔔 [NotificationService] Getting push token...');
    
    try {
      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem('expo_push_token');
      if (cachedToken) {
        console.log('🔔 [NotificationService] Using cached token');
        return cachedToken;
      }

      // Get project ID from Constants (try different sources)
      let projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                      Constants.easConfig?.projectId ??
                      Constants.expoConfig?.extra?.projectId ??
                      Constants.manifest2?.extra?.eas?.projectId;
      
      // For development, try to generate a token without project ID first
      if (!projectId) {
        console.warn('🔔 [NotificationService] No project ID found, trying without project ID for development...');
        
        try {
          // Try to get token without project ID (works in development)
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          console.log('🔔 [NotificationService] Generated token without project ID:', token.substring(0, 20) + '...');
          
          // Cache the token
          await AsyncStorage.setItem('expo_push_token', token);
          return token;
        } catch (devError) {
          console.error('🔔 [NotificationService] Failed to get token without project ID:', devError);
          
          // Check if we already have a cached mock token for this device
          const cachedMockToken = await AsyncStorage.getItem('expo_push_token');
          if (cachedMockToken && cachedMockToken.startsWith('ExponentPushToken[dev-')) {
            console.warn('🔔 [NotificationService] Reusing existing mock token:', cachedMockToken.substring(0, 20) + '...');
            return cachedMockToken;
          }
          
          // Create a stable mock token for development based on device info
          const deviceInfo = await Device.getDeviceTypeAsync();
          const deviceId = Constants.sessionId || 'unknown';
          const stableId = `dev-${deviceInfo}-${deviceId.slice(0, 8)}`;
          const mockToken = `ExponentPushToken[${stableId}]`;
          
          console.warn('🔔 [NotificationService] Created stable mock token for development:', mockToken.substring(0, 20) + '...');
          
          await AsyncStorage.setItem('expo_push_token', mockToken);
          return mockToken;
        }
      }

      console.log('🔔 [NotificationService] Using project ID:', projectId);

      // Get the token with project ID
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      console.log('🔔 [NotificationService] Generated new token:', token.substring(0, 20) + '...');

      // Cache the token
      await AsyncStorage.setItem('expo_push_token', token);
      
      return token;
    } catch (error) {
      console.error('🔔 [NotificationService] Error getting push token:', error);
      
      // Check if we already have a cached fallback token
      const cachedFallbackToken = await AsyncStorage.getItem('expo_push_token');
      if (cachedFallbackToken && cachedFallbackToken.startsWith('ExponentPushToken[fallback-')) {
        console.warn('🔔 [NotificationService] Reusing existing fallback token:', cachedFallbackToken.substring(0, 20) + '...');
        return cachedFallbackToken;
      }
      
      // Create a stable fallback token based on device info
      const deviceInfo = await Device.getDeviceTypeAsync();
      const deviceId = Constants.sessionId || 'unknown';
      const stableId = `fallback-${deviceInfo}-${deviceId.slice(0, 8)}`;
      const fallbackToken = `ExponentPushToken[${stableId}]`;
      
      console.warn('🔔 [NotificationService] Created stable fallback token:', fallbackToken.substring(0, 20) + '...');
      
      await AsyncStorage.setItem('expo_push_token', fallbackToken);
      return fallbackToken;
    }
  }

  // Get token info for backend registration
  async getTokenInfo(): Promise<PushNotificationToken | null> {
    if (!this.pushToken) {
      await this.initialize();
    }

    if (!this.pushToken) {
      console.warn('🔔 [NotificationService] No push token available');
      return null;
    }

    return {
      token: this.pushToken,
      deviceId: Constants.sessionId || 'unknown',
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };
  }

  // Register push token with backend
  async registerWithBackend(): Promise<boolean> {
    console.log('🔔 [NotificationService] Registering push token with backend...');
    
    try {
      const tokenInfo = await this.getTokenInfo();
      if (!tokenInfo) {
        console.warn('🔔 [NotificationService] No token info available for registration');
        return false;
      }

      const tokenData: PushTokenData = {
        token: tokenInfo.token,
        deviceId: tokenInfo.deviceId,
        platform: tokenInfo.platform,
        appVersion: tokenInfo.appVersion,
      };

      const response = await apiService.registerPushToken(tokenData);
      
      if (response.success) {
        console.log('🔔 [NotificationService] Successfully registered push token with backend');
        // Cache registration status
        await AsyncStorage.setItem('push_token_registered', 'true');
        return true;
      } else {
        console.error('🔔 [NotificationService] Failed to register push token:', response.error);
        return false;
      }
    } catch (error) {
      console.error('🔔 [NotificationService] Error registering push token:', error);
      return false;
    }
  }

  // Unregister push token from backend
  async unregisterWithBackend(): Promise<boolean> {
    console.log('🔔 [NotificationService] Unregistering push token from backend...');
    
    try {
      const deviceId = Constants.sessionId || 'unknown';
      const response = await apiService.unregisterPushToken(deviceId);
      
      if (response.success) {
        console.log('🔔 [NotificationService] Successfully unregistered push token from backend');
        // Clear registration status
        await AsyncStorage.removeItem('push_token_registered');
        return true;
      } else {
        console.error('🔔 [NotificationService] Failed to unregister push token:', response.error);
        return false;
      }
    } catch (error) {
      console.error('🔔 [NotificationService] Error unregistering push token:', error);
      return false;
    }
  }

  // Clear cached token (useful for logout)
  async clearToken(): Promise<void> {
    console.log('🔔 [NotificationService] Clearing push token...');
    
    // Don't unregister from backend here - this should be done before logout
    // Just clear local state
    this.pushToken = null;
    this.isInitialized = false;
    await AsyncStorage.removeItem('expo_push_token');
    await AsyncStorage.removeItem('push_token_registered');
    useNotificationStore.getState().reset();
    
    console.log('🔔 [NotificationService] Push token cleared from local storage');
  }

  // Add notification listeners
  addNotificationListeners() {
    console.log('🔔 [NotificationService] Adding notification listeners...');

    // Listener for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 [NotificationService] Notification received while app running:', notification);
      
      // Handle the notification - refresh video summaries data using incremental sync
      const data = notification.request.content.data;
      
      if (data?.type === 'new_video_summary') {
        console.log('🔔 [NotificationService] New video summary notification received, triggering incremental sync...');
        console.log('🔔 [NotificationService] Video data:', {
          videoId: data.videoId,
          channelId: data.channelId,
          channelName: data.channelName
        });
        
        // Trigger refetch which will use incremental sync to get only new videos
        queryClient.refetchQueries({
          queryKey: ['videoSummariesCached']
        }).then(() => {
          console.log('🔔 [NotificationService] Video summaries refetch completed - new video should be in cache now');
        }).catch((error) => {
          console.error('🔔 [NotificationService] Error during video summaries refetch:', error);
        });
        
        // Also refetch regular video summaries cache for compatibility
        queryClient.refetchQueries({
          queryKey: ['videoSummaries']
        });
      }
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 [NotificationService] User tapped notification:', response);
      
      // Handle notification tap - navigate to specific summary or summaries tab
      const data = response.notification.request.content.data;
      
      try {
        // Trigger incremental sync before navigation to ensure fresh data
        if (data?.type === 'new_video_summary') {
          console.log('🔔 [NotificationService] Triggering incremental sync before navigation...');
          
          // Use refetch instead of invalidate to leverage incremental sync
          queryClient.refetchQueries({
            queryKey: ['videoSummariesCached']
          });
          
          queryClient.refetchQueries({
            queryKey: ['videoSummaries']
          });
        }
        
        // If there's specific video data, navigate to detail screen
        if (data?.videoId) {
          console.log('🔔 [NotificationService] Navigating to summary detail for video:', data.videoId);
          
          router.push({
            pathname: '/summary-detail',
            params: { summaryId: data.videoId }
          });
        } else {
          console.log('🔔 [NotificationService] No videoId, navigating to summaries tab...');
          
          // Fallback: Navigate to summaries tab when no specific video ID
          router.replace('/(tabs)/summaries');
        }
      } catch (error) {
        console.error('🔔 [NotificationService] Error navigating to summary detail:', error);
        // Fallback: try to navigate to summaries tab
        try {
          router.replace('/(tabs)/summaries');
        } catch (fallbackError) {
          console.error('🔔 [NotificationService] Fallback navigation also failed:', fallbackError);
        }
      }
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  // Remove notification listeners
  removeNotificationListeners(listeners: {
    notificationListener: Notifications.Subscription;
    responseListener: Notifications.Subscription;
  }) {
    console.log('🔔 [NotificationService] Removing notification listeners...');
    Notifications.removeNotificationSubscription(listeners.notificationListener);
    Notifications.removeNotificationSubscription(listeners.responseListener);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();