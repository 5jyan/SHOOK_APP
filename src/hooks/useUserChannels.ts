import { useState, useEffect, useCallback } from 'react';
import { apiService, type YoutubeChannel, type UserChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useUserChannels() {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserChannels = useCallback(async () => {
    if (!user || !user.id) {
      console.log('📡 No user or user ID available, skipping channel fetch');
      setChannels([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 Fetching user channels for user:', user.id);
      const userId = parseInt(user.id, 10);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await apiService.getUserChannels(userId);
      
      if (response.success) {
        console.log('✅ User channels fetched successfully:', response.data);
        console.log('📊 Channel data structure:', JSON.stringify(response.data, null, 2));
        setChannels(response.data || []);
        console.log('📋 Channels set to state, count:', response.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch user channels:', response.error);
        setError(response.error || 'Failed to fetch channels');
        setChannels([]);
      }
    } catch (err) {
      console.error('❌ User channels fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching channels');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      console.log('🗑️ Deleting channel:', channelId);
      const response = await apiService.deleteChannel(channelId);
      
      if (response.success) {
        console.log('✅ Channel deleted successfully');
        setChannels(prev => prev.filter(ch => ch.youtubeChannel.channelId !== channelId));
        return true;
      } else {
        console.error('❌ Failed to delete channel:', response.error);
        throw new Error(response.error || 'Failed to delete channel');
      }
    } catch (err) {
      console.error('❌ Channel delete error:', err);
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