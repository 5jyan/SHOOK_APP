// Notification service for Expo Push Notifications
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useNotificationStore } from '@/stores/notification-store';
import { apiService, type PushTokenData } from './api';
import { PushRegistrationCoordinator } from './push-registration-coordinator';
import { queryClient } from '@/lib/query-client';
import { videoSummaryService } from '@/services/video-summary-service';
import { getVideoSummariesQueryKey, type CacheAwareData, videoSummariesSyncService } from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { notificationLogger } from '@/utils/logger-enhanced';
import { getOrCreateDeviceId } from './device-id';

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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
  private initializationPromise: Promise<void> | null = null;
  private initializationRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private initializationRetryAttempt = 0;
  private pushTokenRequestPromise: Promise<string | null> | null = null;
  private isHandlingPushTokenRollover = false;
  private registrationCoordinator = new PushRegistrationCoordinator();
  private lastHandledResponseId: string | null = null;
  private readonly PUSH_TOKEN_KEY = 'expo_push_token';
  private readonly NOTIFICATIONS_ENABLED_KEY = 'push_notifications_enabled';
  private readonly ANDROID_CHANNEL_ID = 'default';

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Check current registration status from DB and sync with local state
  async syncWithBackendState(): Promise<boolean> {
    const syncId = Math.random().toString(36).substr(2, 9);
    notificationLogger.info(`🔄 Syncing notification state with backend [${syncId}]`);
    
    try {
      const response = await apiService.getPushTokenStatus();
      
      notificationLogger.debug('Raw API response for token status', {
        success: response.success,
        data: response.data,
        error: response.error,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data)
      });
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const tokens = response.data;
        const deviceId = await this.getDeviceId();
        
        // Find current device's token
        const currentDeviceToken = tokens.find(token => token.deviceId === deviceId);
        const permissions = await Notifications.getPermissionsAsync();
        const preferenceEnabled = await this.isNotificationsEnabled();
        const shouldRemainRegistered = this.areNotificationsAllowed(permissions) && preferenceEnabled;
        let isRegisteredInDB = !!currentDeviceToken?.isActive;

        if (isRegisteredInDB && !shouldRemainRegistered) {
          const unregisterResponse = await apiService.unregisterPushToken(deviceId);
          if (unregisterResponse.success) {
            isRegisteredInDB = false;
          }
        }
        
        notificationLogger.info('Backend state sync results', {
          totalTokens: tokens.length,
          currentDeviceId: deviceId,
          currentDeviceToken: currentDeviceToken ? {
            deviceId: currentDeviceToken.deviceId,
            isActive: currentDeviceToken.isActive,
            platform: currentDeviceToken.platform,
            createdAt: currentDeviceToken.createdAt
          } : null,
          isRegisteredInDB,
          currentStoreState: {
            isRegistered: useNotificationStore.getState().isRegistered,
            isUIEnabled: useNotificationStore.getState().isUIEnabled,
            permissionStatus: useNotificationStore.getState().permissionStatus
          }
        });
        
        // Update store with backend state
        useNotificationStore.getState().setRegistered(isRegisteredInDB);
        
        // Also check system permissions to ensure UI state is correct
        useNotificationStore.getState().setPermissionStatus(
          this.areNotificationsAllowed(permissions) ? 'granted' : permissions.status
        );

        return true;
        
      } else {
        notificationLogger.warn('Failed to fetch backend token status or invalid data format', { 
          success: response.success,
          error: response.error,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          data: response.data
        });
        // Keep the last known registration state when the backend is temporarily unavailable.
        return false;
      }
    } catch (error) {
      notificationLogger.error('Error syncing with backend state', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Keep the last known registration state when the backend is temporarily unavailable.
      return false;
    } finally {
      // Update last sync time regardless of success or failure
      useNotificationStore.getState().setLastSyncTime(Date.now());
      notificationLogger.info(`✅ Backend sync completed [${syncId}]`);
    }
  }

  // Initialize notification service - call this after user login
  async initialize(forceReinitialization: boolean = false): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(forceReinitialization);
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(forceReinitialization: boolean): Promise<void> {
    if (this.isInitialized && !forceReinitialization) {
      notificationLogger.debug('Already initialized, skipping...');
      return;
    }

    if (!forceReinitialization && !(await this.isNotificationsEnabled())) {
      notificationLogger.info('Notification registration skipped because the user disabled it');
      useNotificationStore.getState().setRegistered(false);
      return;
    }

    if (forceReinitialization) {
      notificationLogger.info('Force re-initialization requested');
      this.isInitialized = false;
    }

    useNotificationStore.getState().setRegistering(true);

    try {
      notificationLogger.info('Initializing notification service');
      
      // Request permissions
      const permission = await this.requestPermissions();
      if (!this.areNotificationsAllowed(permission)) {
        notificationLogger.warn('Notification permissions denied');
        await this.unregisterWithBackend(false);
        useNotificationStore.getState().setRegistered(false, 'Notification permissions denied');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        notificationLogger.info('Successfully initialized with push token');
        
        notificationLogger.debug('Calling registerWithBackend');
        // Register with backend (this will now handle duplicates properly)
        const success = await this.registerWithBackend();
        notificationLogger.debug('registerWithBackend completed', { success });
        useNotificationStore.getState().setRegistered(success, success ? null : 'Registration failed');
        this.isInitialized = success;
        if (success) {
          this.cancelInitializationRetry();
        } else {
          this.scheduleInitializationRetry();
        }

      } else {
        useNotificationStore.getState().setRegistered(false, 'Could not get push token');
        this.scheduleInitializationRetry();
      }
    } catch (error) {
      notificationLogger.error('Failed to initialize', { error: error instanceof Error ? error.message : String(error) });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useNotificationStore.getState().setRegistered(false, errorMessage);
      this.scheduleInitializationRetry();
    } finally {
      useNotificationStore.getState().setRegistering(false);
    }
  }

  private scheduleInitializationRetry(): void {
    if (this.initializationRetryTimer || this.initializationRetryAttempt >= 3) {
      return;
    }

    const retryDelays = [5_000, 30_000, 120_000];
    const delay = retryDelays[this.initializationRetryAttempt];
    this.initializationRetryAttempt += 1;
    notificationLogger.info('Scheduling push registration retry', {
      attempt: this.initializationRetryAttempt,
      delayMs: delay,
    });

    this.initializationRetryTimer = setTimeout(() => {
      this.initializationRetryTimer = null;
      if (!useAuthStore.getState().isAuthenticated) {
        return;
      }
      void this.initialize().catch((error) => {
        notificationLogger.error('Push registration retry failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, delay);
  }

  private cancelInitializationRetry(): void {
    if (this.initializationRetryTimer) {
      clearTimeout(this.initializationRetryTimer);
      this.initializationRetryTimer = null;
    }
    this.initializationRetryAttempt = 0;
  }

  private async getDeviceId(): Promise<string> {
    return getOrCreateDeviceId();
  }

  async getDeviceIdForBackend(): Promise<string> {
    return this.getDeviceId();
  }

  async isNotificationsEnabled(): Promise<boolean> {
    const preference = await AsyncStorage.getItem(this.NOTIFICATIONS_ENABLED_KEY);
    return preference !== 'false';
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(this.NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  private async ensureAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    await Notifications.setNotificationChannelAsync(this.ANDROID_CHANNEL_ID, {
      name: '새 영상 알림',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  areNotificationsAllowed(permissions: Notifications.NotificationPermissionsStatus): boolean {
    if (permissions.granted) {
      return true;
    }

    return Platform.OS === 'ios' && (
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }

  // Request notification permissions
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    notificationLogger.info('Requesting notification permissions');
    
    try {
      await this.ensureAndroidNotificationChannel();

      // First check existing permissions
      let permissions = await Notifications.getPermissionsAsync();
      notificationLogger.debug('Current permissions', { permissions });

      if (!this.areNotificationsAllowed(permissions)) {
        // Request permissions if not granted
        permissions = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
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
  async getPushToken(forceRefresh = false): Promise<string | null> {
    if (this.pushTokenRequestPromise) {
      return this.pushTokenRequestPromise;
    }

    this.pushTokenRequestPromise = this.fetchPushToken(forceRefresh);
    try {
      return await this.pushTokenRequestPromise;
    } finally {
      this.pushTokenRequestPromise = null;
    }
  }

  private async fetchPushToken(forceRefresh: boolean): Promise<string | null> {
    notificationLogger.info('Getting push token');
    
    try {
      await this.ensureAndroidNotificationChannel();

      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem(this.PUSH_TOKEN_KEY);
      if (cachedToken && !forceRefresh) {
        notificationLogger.debug('Using cached token');
        return cachedToken;
      }

      // Get project ID from Constants (try different sources)
      // Fallback to hardcoded project ID for bare workflow (Android/iOS native builds)
      const HARDCODED_PROJECT_ID = 'a8839540-39ec-431e-a346-bdfdff731ecd';

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                        Constants.easConfig?.projectId ??
                        Constants.expoConfig?.extra?.projectId ??
                        Constants.manifest2?.extra?.eas?.projectId ??
                        HARDCODED_PROJECT_ID;

      const usedFallback = projectId === HARDCODED_PROJECT_ID;

      notificationLogger.info('Project ID resolved', {
        projectId,
        usedFallback,
        platform: Platform.OS
      });

      // Get the token with project ID
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      notificationLogger.info('Successfully generated push token', { usedFallback });

      // Cache the token
      await AsyncStorage.setItem(this.PUSH_TOKEN_KEY, token);

      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationLogger.error('Failed to generate push token', {
        error: errorMessage,
        platform: Platform.OS
      });

      throw new Error(`푸시 알림 토큰 생성에 실패했습니다: ${errorMessage}`);
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

    const deviceId = await this.getDeviceId();
    return {
      token: this.pushToken,
      deviceId,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };
  }

  // Register push token with backend (simplified - let backend handle duplicates)
  async registerWithBackend(force = false): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();
    if (!tokenInfo) {
      notificationLogger.warn('No token info available for registration');
      return false;
    }

    const userId = useAuthStore.getState().user?.id ?? 'unknown';
    const signature = [userId, tokenInfo.deviceId, tokenInfo.token].join(':');

    return this.registrationCoordinator.run(
      signature,
      () => this.performBackendRegistration(tokenInfo),
      force
    );
  }

  private async performBackendRegistration(tokenInfo: PushNotificationToken): Promise<boolean> {
    notificationLogger.info('Registering push token with backend');

    try {
      const tokenData: PushTokenData = {
        token: tokenInfo.token,
        deviceId: tokenInfo.deviceId,
        platform: tokenInfo.platform,
        appVersion: tokenInfo.appVersion,
      };

      notificationLogger.debug('Sending token to backend', {
        deviceId: tokenInfo.deviceId,
        platform: tokenInfo.platform
      });

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
  async unregisterWithBackend(updatePreference = true): Promise<boolean> {
    notificationLogger.info('Unregistering push token from backend');
    
    try {
      const deviceId = await this.getDeviceId();
      const response = await apiService.unregisterPushToken(deviceId);
      
      if (response.success) {
        notificationLogger.info('Successfully unregistered push token from backend');
        this.cancelInitializationRetry();
        this.registrationCoordinator.reset();
        // Clear registration status
        await AsyncStorage.removeItem('push_token_registered');
        // Reset initialization state so user can re-enable later
        this.isInitialized = false;
        // Update store state
        useNotificationStore.getState().setRegistered(false);
        // Update last sync time since we just made an API call
        useNotificationStore.getState().setLastSyncTime(Date.now());
        if (updatePreference) {
          await this.setNotificationsEnabled(false);
        }
        return true;
      } else {
        notificationLogger.error('Failed to unregister push token', { error: response.error });
        // Update store with error
        useNotificationStore.getState().setRegistered(true, response.error || 'Failed to unregister');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationLogger.error('Error unregistering push token', { error: errorMessage });
      // Update store with error
      useNotificationStore.getState().setRegistered(true, errorMessage);
      return false;
    }
  }

  // Force re-register with backend (useful for re-enabling notifications)
  async forceRegister(): Promise<boolean> {
    notificationLogger.info('Force registering push token with backend');
    
    try {
      // Ensure we have a push token
      if (!this.pushToken) {
        const token = await this.getPushToken();
        if (!token) {
          notificationLogger.error('Could not get push token for force registration');
          useNotificationStore.getState().setRegistered(false, 'Could not get push token');
          return false;
        }
        this.pushToken = token;
      }

      // Register with backend regardless of current state
      const success = await this.registerWithBackend(true);
      
      if (success) {
        notificationLogger.info('Force registration successful');
        this.isInitialized = true;
        this.cancelInitializationRetry();
        await this.setNotificationsEnabled(true);
        useNotificationStore.getState().setRegistered(true);
      } else {
        notificationLogger.warn('Force registration failed');
        useNotificationStore.getState().setRegistered(false, 'Force registration failed');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationLogger.error('Error in force registration', { error: errorMessage });
      useNotificationStore.getState().setRegistered(false, errorMessage);
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
    this.cancelInitializationRetry();
    this.registrationCoordinator.reset();
    await AsyncStorage.removeItem(this.PUSH_TOKEN_KEY);
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
      void Notifications.setBadgeCountAsync(0);
      
      // Handle the notification - refresh video summaries data using incremental sync
      const data = notification.request.content.data;
      
      if (data?.type === 'new_video_summary') {
        notificationLogger.info('New video summary notification received, triggering incremental sync', {
          videoId: data.videoId,
          channelId: data.channelId,
          channelName: data.channelName
        });

        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          const queryKey = getVideoSummariesQueryKey(userId);
          const existingData = queryClient.getQueryData<CacheAwareData>(queryKey);
          void videoSummariesSyncService.markSyncNeeded(userId)
            .then(() => videoSummariesSyncService.syncIfNeeded({
              userId,
              existingCursor: existingData?.nextCursor,
              queryClient,
              reason: 'foreground_push',
              force: true,
            }))
            .catch((error) => {
              notificationLogger.error('Failed to sync summaries after foreground push', {
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }

        if (data.videoId) {
          videoSummaryService.fetchSummaryById(String(data.videoId)).then((summary) => {
            const userId = useAuthStore.getState().user?.id;
            if (!userId) {
              return;
            }

            const queryKey = getVideoSummariesQueryKey(userId);
            queryClient.setQueryData<CacheAwareData>(queryKey, (existing) => {
              if (!existing) {
                return existing;
              }

              let hasUpdate = false;
              const updatedVideos = existing.videos.map((video) => {
                if (video.videoId !== summary.videoId) {
                  return video;
                }
                hasUpdate = true;
                return { ...video, ...summary };
              });

              if (!hasUpdate) {
                return existing;
              }

              return {
                ...existing,
                videos: updatedVideos,
                lastSync: Date.now(),
              };
            });

            notificationLogger.info('Video summary merged into cache from foreground push', {
              videoId: summary.videoId
            });
          }).catch((error) => {
            notificationLogger.error('Failed to fetch summary after push notification', {
              error: error instanceof Error ? error.message : String(error),
              videoId: data.videoId
            });
          });
        }

        // Also refetch regular video summaries cache for compatibility
        queryClient.refetchQueries({
          queryKey: ['videoSummaries']
        });
      }
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      void this.handleNotificationResponse(response);
    });

    const pushTokenListener = Notifications.addPushTokenListener(() => {
      if (this.pushTokenRequestPromise || this.isHandlingPushTokenRollover) {
        return;
      }
      void this.handlePushTokenRollover();
    });

    return {
      notificationListener,
      responseListener,
      pushTokenListener,
    };
  }

  private async handlePushTokenRollover(): Promise<void> {
    if (this.isHandlingPushTokenRollover) {
      return;
    }

    this.isHandlingPushTokenRollover = true;
    try {
      if (!(await this.isNotificationsEnabled()) || !useAuthStore.getState().isAuthenticated) {
        return;
      }

      const token = await this.getPushToken(true);
      if (!token) return;
      this.pushToken = token;
      await this.registerWithBackend();
    } catch (error) {
      notificationLogger.error('Failed to register a rolled push token', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isHandlingPushTokenRollover = false;
    }
  }

  // Remove notification listeners
  removeNotificationListeners(listeners: {
    notificationListener: Notifications.Subscription;
    responseListener: Notifications.Subscription;
    pushTokenListener: Notifications.Subscription;
  }) {
    notificationLogger.info('Removing notification listeners');
    listeners.notificationListener.remove();
    listeners.responseListener.remove();
    listeners.pushTokenListener.remove();
  }

  // Handle notification tap for both foreground/background and cold start cases
  async handleInitialNotificationResponse(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) {
        return;
      }
      for (let attempt = 0; attempt < 50 && !useAuthStore.getState().isAuthenticated; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await this.handleNotificationResponse(response);
      await Notifications.clearLastNotificationResponseAsync();
    } catch (error) {
      notificationLogger.error('Failed to handle initial notification response', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const responseId = response.notification.request.identifier;
    if (this.lastHandledResponseId === responseId) {
      return;
    }
    this.lastHandledResponseId = responseId;

    notificationLogger.info('User tapped notification', { title: response.notification.request.content.title });

    // Handle notification tap - navigate to specific summary or summaries tab
    const data = response.notification.request.content.data;
    await Notifications.setBadgeCountAsync(0);

    try {
      const videoId =
        data?.type === 'new_video_summary' &&
        (typeof data?.videoId === 'string' || typeof data?.videoId === 'number')
          ? String(data.videoId)
          : null;
      if (videoId) {
        notificationLogger.info('Handling notification tap for video', { videoId });

        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          const queryKey = getVideoSummariesQueryKey(userId);
          const existingData = queryClient.getQueryData<CacheAwareData>(queryKey);
          await videoSummariesSyncService.markSyncNeeded(userId);
          void videoSummariesSyncService.syncIfNeeded({
            userId,
            existingCursor: existingData?.nextCursor,
            queryClient,
            reason: 'notification_tap',
            force: true,
          });
        }

        // Navigate to summaries tab first, then push detail for a smoother UX
        notificationLogger.info('Navigating to summaries tab before summary detail', { videoId });
        router.replace({
          pathname: '/(tabs)/summaries',
          params: {
            fromNotification: 'true',
            _t: String(Date.now())
          }
        });
        setTimeout(() => {
          router.push({
            pathname: '/summary-detail',
            params: {
              summaryId: videoId,
              fromNotification: 'true'  // Flag to trigger polling
            }
          });
        }, 50);
      } else {
        notificationLogger.info('No videoId, navigating to summaries tab');

        // Fallback: Navigate to summaries tab when no specific video ID
        router.replace('/(tabs)/summaries');
      }
    } catch (error) {
      notificationLogger.error('Error navigating to summary detail', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback: try to navigate to summaries tab
      try {
        router.replace('/(tabs)/summaries');
      } catch (fallbackError) {
        notificationLogger.error('Fallback navigation also failed', {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
      }
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
