import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, type UserChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { videoCacheService } from '@/services/video-cache';

interface ChannelsContextType {
  channels: UserChannel[];
  isLoading: boolean;
  error: string | null;
  channelCount: number;
  fetchChannels: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  deleteChannel: (channelId: string) => Promise<boolean>;
}

const ChannelsContext = createContext<ChannelsContextType | undefined>(undefined);

interface ChannelsProviderProps {
  children: React.ReactNode;
}

export function ChannelsProvider({ children }: ChannelsProviderProps) {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!user || !user.id) {
      console.log('📡 No user or user ID available, skipping channel fetch');
      setChannels([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 [ChannelsContext] Fetching user channels for user:', user.id);
      const userId = parseInt(user.id, 10);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await apiService.getUserChannels(userId);
      
      if (response.success) {
        console.log('✅ [ChannelsContext] User channels fetched successfully:', response.data);
        console.log('📊 [ChannelsContext] Channel data structure:', JSON.stringify(response.data, null, 2));
        setChannels(response.data || []);
        console.log('📋 [ChannelsContext] Channels set to state, count:', response.data?.length || 0);
      } else {
        console.error('❌ [ChannelsContext] Failed to fetch user channels:', response.error);
        setError(response.error || 'Failed to fetch channels');
        setChannels([]);
      }
    } catch (err) {
      console.error('❌ [ChannelsContext] User channels fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching channels');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshChannels = useCallback(async () => {
    console.log('🔄 [ChannelsContext] Refreshing channels...');
    await fetchChannels();
  }, [fetchChannels]);

  const deleteChannel = useCallback(async (channelId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [ChannelsContext] Deleting channel:', channelId);
      const response = await apiService.deleteChannel(channelId);
      
      if (response.success) {
        console.log('✅ [ChannelsContext] Channel deleted successfully');
        
        // Update local state immediately
        setChannels(prev => prev.filter(ch => ch.youtubeChannel.channelId !== channelId));
        
        // Remove related video summaries from cache
        console.log('🗑️ [ChannelsContext] Removing related video summaries from cache...');
        try {
          await videoCacheService.removeChannelVideos(channelId);
          console.log('✅ [ChannelsContext] Related video summaries removed from cache');
        } catch (cacheError) {
          console.error('❌ [ChannelsContext] Error removing video summaries from cache:', cacheError);
          // Don't fail the channel deletion if cache cleanup fails
        }
        
        return true;
      } else {
        console.error('❌ [ChannelsContext] Failed to delete channel:', response.error);
        throw new Error(response.error || 'Failed to delete channel');
      }
    } catch (err) {
      console.error('❌ [ChannelsContext] Channel delete error:', err);
      throw err;
    }
  }, []);

  // Fetch channels when user changes
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const contextValue: ChannelsContextType = {
    channels,
    isLoading,
    error,
    channelCount: channels.length,
    fetchChannels,
    refreshChannels,
    deleteChannel,
  };

  return (
    <ChannelsContext.Provider value={contextValue}>
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels(): ChannelsContextType {
  const context = useContext(ChannelsContext);
  if (!context) {
    throw new Error('useChannels must be used within a ChannelsProvider');
  }
  return context;
}