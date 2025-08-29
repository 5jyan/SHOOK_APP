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
import { notificationLogger } from '@/utils/logger-enhanced';

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
      notificationLogger.debug('Already initialized');
      return;
    }

    useNotificationStore.getState().setRegistering(true);

    try {
      notificationLogger.info('Initializing notification service');
      
      // Check if device supports push notifications
      if (!Device.isDevice) {
        notificationLogger.warn('Push notifications only work on physical devices');
        useNotificationStore.getState().setRegistered(false, 'Push notifications only work on physical devices');
        return;
      }

      // Request permissions
      const permission = await this.requestPermissions();
      if (!permission.granted) {
        notificationLogger.warn('Notification permissions denied');
        useNotificationStore.getState().setRegistered(false, 'Notification permissions denied');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        notificationLogger.info('Successfully initialized with token', { tokenPreview: token.substring(0, 20) + '...' });
        
        notificationLogger.debug('Calling registerWithBackend');
        // Register with backend
        const success = await this.registerWithBackend();
        notificationLogger.debug('registerWithBackend completed', { success });
        useNotificationStore.getState().setRegistered(success);

      } else {
        useNotificationStore.getState().setRegistered(false, 'Could not get push token');
      }

      this.isInitialized = true;
    } catch (error) {
      notificationLogger.error('Failed to initialize', { error: error instanceof Error ? error.message : String(error) });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useNotificationStore.getState().setRegistered(false, errorMessage);
    } finally {
      useNotificationStore.getState().setRegistering(false);
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    notificationLogger.info('Requesting notification permissions');
    
    try {
      // First check existing permissions
      let permissions = await Notifications.getPermissionsAsync();
      notificationLogger.debug('Current permissions', { permissions });

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
        notificationLogger.debug('New permissions', { permissions });
      }

      return permissions;
    } catch (error) {
      notificationLogger.error('Error requesting permissions', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Get Expo push token
  async getPushToken(): Promise<string | null> {
    notificationLogger.info('Getting push token');
    
    try {
      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem('expo_push_token');
      if (cachedToken) {
        notificationLogger.debug('Using cached token');
        return cachedToken;
      }

      // Get project ID from Constants (try different sources)
      let projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                      Constants.easConfig?.projectId ??
                      Constants.expoConfig?.extra?.projectId ??
                      Constants.manifest2?.extra?.eas?.projectId;
      
      // For development, try to generate a token without project ID first
      if (!projectId) {
        notificationLogger.warn('No project ID found, trying without project ID for development');
        
        try {
          // Try to get token without project ID (works in development)
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          notificationLogger.info('Generated token without project ID', { tokenPreview: token.substring(0, 20) + '...' });
          
          // Cache the token
          await AsyncStorage.setItem('expo_push_token', token);
          return token;
        } catch (devError) {
          notificationLogger.error('Failed to get token without project ID', { error: devError instanceof Error ? devError.message : String(devError) });
          
          // Check if we already have a cached mock token for this device
          const cachedMockToken = await AsyncStorage.getItem('expo_push_token');
          if (cachedMockToken && cachedMockToken.startsWith('ExponentPushToken[dev-')) {
            notificationLogger.warn('Reusing existing mock token', { tokenPreview: cachedMockToken.substring(0, 20) + '...' });
            return cachedMockToken;
          }
          
          // Create a stable mock token for development based on device info
          const deviceInfo = await Device.getDeviceTypeAsync();
          const deviceId = Constants.sessionId || 'unknown';
          const stableId = `dev-${deviceInfo}-${deviceId.slice(0, 8)}`;
          const mockToken = `ExponentPushToken[${stableId}]`;
          
          notificationLogger.warn('Created stable mock token for development', { tokenPreview: mockToken.substring(0, 20) + '...' });
          
          await AsyncStorage.setItem('expo_push_token', mockToken);
          return mockToken;
        }
      }

      notificationLogger.info('Using project ID', { projectId });

      // Get the token with project ID
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      notificationLogger.info('Generated new token', { tokenPreview: token.substring(0, 20) + '...' });

      // Cache the token
      await AsyncStorage.setItem('expo_push_token', token);
      
      return token;
    } catch (error) {
      notificationLogger.error('Error getting push token', { error: error instanceof Error ? error.message : String(error) });
      
      // Check if we already have a cached fallback token
      const cachedFallbackToken = await AsyncStorage.getItem('expo_push_token');
      if (cachedFallbackToken && cachedFallbackToken.startsWith('ExponentPushToken[fallback-')) {
        notificationLogger.warn('Reusing existing fallback token', { tokenPreview: cachedFallbackToken.substring(0, 20) + '...' });
        return cachedFallbackToken;
      }
      
      // Create a stable fallback token based on device info
      const deviceInfo = await Device.getDeviceTypeAsync();
      const deviceId = Constants.sessionId || 'unknown';
      const stableId = `fallback-${deviceInfo}-${deviceId.slice(0, 8)}`;
      const fallbackToken = `ExponentPushToken[${stableId}]`;
      
      notificationLogger.warn('Created stable fallback token', { tokenPreview: fallbackToken.substring(0, 20) + '...' });
      
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
      notificationLogger.warn('No push token available');
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
    notificationLogger.info('Registering push token with backend');
    
    try {
      const tokenInfo = await this.getTokenInfo();
      if (!tokenInfo) {
        notificationLogger.warn('No token info available for registration');
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
        notificationLogger.info('Successfully registered push token with backend');
        // Cache registration status
        await AsyncStorage.setItem('push_token_registered', 'true');
        return true;
      } else {
        notificationLogger.error('Failed to register push token', { error: response.error });
        return false;
      }
    } catch (error) {
      notificationLogger.error('Error registering push token', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // Unregister push token from backend
  async unregisterWithBackend(): Promise<boolean> {
    notificationLogger.info('Unregistering push token from backend');
    
    try {
      const deviceId = Constants.sessionId || 'unknown';
      const response = await apiService.unregisterPushToken(deviceId);
      
      if (response.success) {
        notificationLogger.info('Successfully unregistered push token from backend');
        // Clear registration status
        await AsyncStorage.removeItem('push_token_registered');
        return true;
      } else {
        notificationLogger.error('Failed to unregister push token', { error: response.error });
        return false;
      }
    } catch (error) {
      notificationLogger.error('Error unregistering push token', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // Clear cached token (useful for logout)
  async clearToken(): Promise<void> {
    notificationLogger.info('Clearing push token');
    
    // Don't unregister from backend here - this should be done before logout
    // Just clear local state
    this.pushToken = null;
    this.isInitialized = false;
    await AsyncStorage.removeItem('expo_push_token');
    await AsyncStorage.removeItem('push_token_registered');
    useNotificationStore.getState().reset();
    
    notificationLogger.info('Push token cleared from local storage');
  }

  // Add notification listeners
  addNotificationListeners() {
    notificationLogger.info('Adding notification listeners');

    // Listener for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      notificationLogger.info('Notification received while app running', { notification: notification.request.content.title });
      
      // Handle the notification - refresh video summaries data using incremental sync
      const data = notification.request.content.data;
      
      if (data?.type === 'new_video_summary') {
        notificationLogger.info('New video summary notification received, triggering incremental sync', {
          videoId: data.videoId,
          channelId: data.channelId,
          channelName: data.channelName
        });
        
        // Trigger refetch which will use incremental sync to get only new videos
        queryClient.refetchQueries({
          queryKey: ['videoSummariesCached']
        }).then(() => {
          notificationLogger.info('Video summaries refetch completed - new video should be in cache now');
        }).catch((error) => {
          notificationLogger.error('Error during video summaries refetch', { error: error instanceof Error ? error.message : String(error) });
        });
        
        // Also refetch regular video summaries cache for compatibility
        queryClient.refetchQueries({
          queryKey: ['videoSummaries']
        });
      }
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      notificationLogger.info('User tapped notification', { title: response.notification.request.content.title });
      
      // Handle notification tap - navigate to specific summary or summaries tab
      const data = response.notification.request.content.data;
      
      try {
        // Trigger incremental sync before navigation to ensure fresh data
        if (data?.type === 'new_video_summary') {
          notificationLogger.debug('Triggering incremental sync before navigation');
          
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
          notificationLogger.info('Navigating to summary detail for video', { videoId: data.videoId });
          
          router.push({
            pathname: '/summary-detail',
            params: { summaryId: data.videoId }
          });
        } else {
          notificationLogger.info('No videoId, navigating to summaries tab');
          
          // Fallback: Navigate to summaries tab when no specific video ID
          router.replace('/(tabs)/summaries');
        }
      } catch (error) {
        notificationLogger.error('Error navigating to summary detail', { error: error instanceof Error ? error.message : String(error) });
        // Fallback: try to navigate to summaries tab
        try {
          router.replace('/(tabs)/summaries');
        } catch (fallbackError) {
          notificationLogger.error('Fallback navigation also failed', { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
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
    notificationLogger.info('Removing notification listeners');
    Notifications.removeNotificationSubscription(listeners.notificationListener);
    Notifications.removeNotificationSubscription(listeners.responseListener);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();