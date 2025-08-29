import { useState, useEffect, useCallback } from 'react';
import { apiService, type YoutubeChannel, type UserChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';

export function useUserChannels() {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserChannels = useCallback(async () => {
    if (!user || !user.id) {
      serviceLogger.info('📡 No user or user ID available, skipping channel fetch');
      setChannels([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      serviceLogger.info('📡 Fetching user channels for user', { userId: user.id });
      const userId = parseInt(user.id, 10);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await apiService.getUserChannels(userId);
      
      if (response.success) {
        serviceLogger.info('✅ User channels fetched successfully', {
          channelCount: response.data?.length || 0,
          hasChannels: !!response.data?.length
        });
        serviceLogger.debug('📊 Channel data structure', { channelData: response.data });
        setChannels(response.data || []);
        serviceLogger.debug('📋 Channels set to state', { count: response.data?.length || 0 });
      } else {
        serviceLogger.error('❌ Failed to fetch user channels', { error: response.error });
        setError(response.error || 'Failed to fetch channels');
        setChannels([]);
      }
    } catch (err) {
      serviceLogger.error('❌ User channels fetch error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : 'An error occurred while fetching channels');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      serviceLogger.info('🗑️ Deleting channel', { channelId });
      const response = await apiService.deleteChannel(channelId);
      
      if (response.success) {
        serviceLogger.info('✅ Channel deleted successfully', { channelId });
        setChannels(prev => prev.filter(ch => ch.youtubeChannel.channelId !== channelId));
        return true;
      } else {
        serviceLogger.error('❌ Failed to delete channel', { channelId, error: response.error });
        throw new Error(response.error || 'Failed to delete channel');
      }
    } catch (err) {
      serviceLogger.error('❌ Channel delete error', {
        channelId,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      throw err;
    }
  }, []);

  const refreshChannels = useCallback(() => {
    fetchUserChannels();
  }, [fetchUserChannels]);

  // Fetch channels when user changes
  useEffect(() => {
    fetchUserChannels();
  }, [fetchUserChannels]);

  return {
    channels,
    isLoading,
    error,
    deleteChannel,
    refreshChannels,
    channelCount: channels.length,
  };
}