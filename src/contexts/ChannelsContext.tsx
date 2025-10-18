import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, type UserChannel } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { videoCacheService } from '@/services/video-cache';
import { serviceLogger } from '@/utils/logger-enhanced';

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
      serviceLogger.info('No user or user ID available, skipping channel fetch');
      setChannels([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      serviceLogger.info('[ChannelsContext] Fetching user channels for user', { userId: user.id });
      const userId = parseInt(user.id, 10);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await apiService.getUserChannels(userId);

      if (response.success) {
        serviceLogger.info('[ChannelsContext] User channels fetched successfully', { channelCount: response.data?.length || 0 });
        serviceLogger.debug('[ChannelsContext] Channel data structure', { channels: response.data });

        // Sort channels by subscription date (oldest first)
        const sortedChannels = (response.data || []).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });

        setChannels(sortedChannels);
        serviceLogger.debug('[ChannelsContext] Channels sorted and set to state', { count: sortedChannels.length });
      } else {
        serviceLogger.error('[ChannelsContext] Failed to fetch user channels', { error: response.error });
        setError(response.error || 'Failed to fetch channels');
        setChannels([]);
      }
    } catch (err) {
      serviceLogger.error('[ChannelsContext] User channels fetch error', { error: err });
      setError(err instanceof Error ? err.message : 'An error occurred while fetching channels');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshChannels = useCallback(async () => {
    serviceLogger.info('[ChannelsContext] Refreshing channels');
    await fetchChannels();
  }, [fetchChannels]);

  const deleteChannel = useCallback(async (channelId: string): Promise<boolean> => {
    try {
      serviceLogger.info('[ChannelsContext] Deleting channel', { channelId });
      const response = await apiService.deleteChannel(channelId);
      
      if (response.success) {
        serviceLogger.info('[ChannelsContext] Channel deleted successfully');
        
        // Update local state immediately
        setChannels(prev => prev.filter(ch => ch.youtubeChannel.channelId !== channelId));
        
        // Remove related video summaries from cache
        serviceLogger.info('[ChannelsContext] Removing related video summaries from cache', { channelId });
        try {
          await videoCacheService.removeChannelVideos(channelId);
          serviceLogger.info('[ChannelsContext] Related video summaries removed from cache', { channelId });
        } catch (cacheError) {
          serviceLogger.error('[ChannelsContext] Error removing video summaries from cache', { channelId, error: cacheError });
          // Don't fail the channel deletion if cache cleanup fails
        }
        
        return true;
      } else {
        serviceLogger.error('[ChannelsContext] Failed to delete channel', { channelId, error: response.error });
        throw new Error(response.error || 'Failed to delete channel');
      }
    } catch (err) {
      serviceLogger.error('[ChannelsContext] Channel delete error', { channelId, error: err });
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