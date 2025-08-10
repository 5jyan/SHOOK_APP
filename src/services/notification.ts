// Notification service for Expo Push Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, type PushTokenData } from './api';

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

    try {
      console.log('🔔 [NotificationService] Initializing notification service...');
      
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('🔔 [NotificationService] Push notifications only work on physical devices');
        return;
      }

      // Request permissions
      const permission = await this.requestPermissions();
      if (!permission.granted) {
        console.warn('🔔 [NotificationService] Notification permissions denied');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        console.log('🔔 [NotificationService] Successfully initialized with token:', token.substring(0, 20) + '...');
        
        // Register with backend
        await this.registerWithBackend();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('🔔 [NotificationService] Failed to initialize:', error);
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
          
          // Create a mock token for development
          const mockToken = `ExponentPushToken[dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
          console.warn('🔔 [NotificationService] Using mock token for development:', mockToken.substring(0, 20) + '...');
          
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
      
      // Create a fallback mock token for development
      const fallbackToken = `ExponentPushToken[fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
      console.warn('🔔 [NotificationService] Using fallback token:', fallbackToken.substring(0, 20) + '...');
      
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
    
    // Unregister from backend first
    await this.unregisterWithBackend();
    
    this.pushToken = null;
    this.isInitialized = false;
    await AsyncStorage.removeItem('expo_push_token');
  }

  // Add notification listeners
  addNotificationListeners() {
    console.log('🔔 [NotificationService] Adding notification listeners...');

    // Listener for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 [NotificationService] Notification received while app running:', notification);
      
      // Handle the notification (you can customize this)
      // For example, update app state, show custom UI, etc.
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 [NotificationService] User tapped notification:', response);
      
      // Handle notification tap (you can customize this)
      // For example, navigate to specific screen, open video, etc.
      const data = response.notification.request.content.data;
      if (data?.videoId) {
        console.log('🔔 [NotificationService] User tapped video notification:', data.videoId);
        // TODO: Navigate to video summary detail screen
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