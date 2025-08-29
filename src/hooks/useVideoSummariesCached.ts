import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiService, VideoSummary, UserChannel } from '@/services/api';
import { videoCacheService } from '@/services/video-cache';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';

interface CacheAwareData {
  videos: VideoSummary[];
  fromCache: boolean;
  lastSync: number;
  cacheStats: {
    totalEntries: number;
    cacheSize: number;
    lastSync: number;
  };
}

export const useVideoSummariesCached = () => {
  const { user } = useAuthStore();
  const [cacheData, setCacheData] = useState<CacheAwareData | null>(null);
  
  serviceLogger.debug('useVideoSummariesCached hook called');
  
  const query = useQuery({
    queryKey: ['videoSummariesCached', user?.id],
    queryFn: async (): Promise<CacheAwareData> => {
      const timerId = serviceLogger.startTimer('hybrid-cache-strategy');
      serviceLogger.info('queryFn executing - hybrid cache strategy starting');
      
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Check if user changed (clear cache if needed)
        await videoCacheService.checkUserChanged(parseInt(user.id));

        // Step 1: Load cached data immediately for instant UI update
        serviceLogger.debug('Step 1: Loading cached data');
        const cachedVideos = await videoCacheService.getCachedVideos();
        const cacheStats = await videoCacheService.getCacheStats();
        
        serviceLogger.info('Cached data loaded', { videoCount: cachedVideos.length });

        // Step 2: Get last sync timestamp for incremental sync
        const lastSyncTimestamp = await videoCacheService.getLastSyncTimestamp();
        serviceLogger.debug('Last sync timestamp', { lastSync: new Date(lastSyncTimestamp).toISOString() });

        // Step 3: Determine sync strategy
        const cacheAge = Date.now() - lastSyncTimestamp;
        const FULL_SYNC_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
        const shouldFullSync = cacheAge > FULL_SYNC_THRESHOLD || lastSyncTimestamp === 0;

        if (shouldFullSync) {
          serviceLogger.info('Full sync required', { cacheAgeHours: Math.round(cacheAge / (1000 * 60 * 60)) });
        } else {
          serviceLogger.info('Incremental sync', { cacheAgeMinutes: Math.round(cacheAge / (1000 * 60)) });
        }

        // Step 4: Fetch new/updated data from server
        let serverResponse;
        let finalVideos: VideoSummary[];

        if (shouldFullSync) {
          // Full sync - get all videos
          serviceLogger.info('Performing full sync');
          serverResponse = await apiService.getVideoSummaries();
          
          if (!serverResponse.success) {
            serviceLogger.error('Full sync failed', { error: serverResponse.error });
            throw new Error(serverResponse.error || 'Failed to fetch video summaries');
          }

          finalVideos = serverResponse.data;
          
          // Replace entire cache
          await videoCacheService.saveVideosToCache(finalVideos);
          serviceLogger.info('Full sync completed', { videosCached: finalVideos.length });
        } else {
          // Incremental sync - get only new videos
          serviceLogger.info('Performing incremental sync');
          serverResponse = await apiService.getVideoSummaries(lastSyncTimestamp);
          
          if (!serverResponse.success) {
            serviceLogger.error('Incremental sync failed', { error: serverResponse.error });
            throw new Error(serverResponse.error || 'Failed to fetch new video summaries');
          }

          const newVideos = serverResponse.data;
          serviceLogger.info('Incremental sync received new videos', { newVideoCount: newVideos.length });

          if (newVideos.length > 0) {
            // Merge new videos with cached ones
            finalVideos = await videoCacheService.mergeVideos(newVideos);
            serviceLogger.info('Cache merged', { totalVideos: finalVideos.length });
          } else {
            // No new videos, use cached data
            finalVideos = cachedVideos;
            serviceLogger.info('No new videos, using cached data');
            
            // Update last sync timestamp even if no new videos
            await videoCacheService.updateCacheMetadata({ lastSyncTimestamp: Date.now() } as any);
          }
        }

        // Step 5: Get updated cache stats
        const updatedCacheStats = await videoCacheService.getCacheStats();

        const result: CacheAwareData = {
          videos: finalVideos,
          fromCache: !shouldFullSync && serverResponse.data.length === 0,
          lastSync: Date.now(),
          cacheStats: {
            totalEntries: updatedCacheStats.totalEntries,
            cacheSize: updatedCacheStats.cacheSize,
            lastSync: updatedCacheStats.lastSync,
          }
        };

        serviceLogger.endTimer(timerId, 'Hybrid sync completed');
        serviceLogger.info('Hybrid sync details', {
          totalVideos: finalVideos.length,
          fromCache: result.fromCache,
          cacheSizeKB: updatedCacheStats.cacheSize,
          syncType: shouldFullSync ? 'full' : 'incremental',
          networkVideos: shouldFullSync ? finalVideos.length : serverResponse.data.length
        });

        return result;
      } catch (error) {
        serviceLogger.endTimer(timerId, 'Hybrid sync failed');
        serviceLogger.error('Hybrid sync error', { error: error instanceof Error ? error.message : String(error) });
        
        // Fallback: try to return cached data on error
        try {
          const fallbackVideos = await videoCacheService.getCachedVideos();
          const fallbackStats = await videoCacheService.getCacheStats();
          
          serviceLogger.info('Using cached fallback', { videoCount: fallbackVideos.length });
          
          return {
            videos: fallbackVideos,
            fromCache: true,
            lastSync: fallbackStats.lastSync,
            cacheStats: {
              totalEntries: fallbackStats.totalEntries,
              cacheSize: fallbackStats.cacheSize,
              lastSync: fallbackStats.lastSync,
            }
          };
        } catch (fallbackError) {
          serviceLogger.error('Fallback also failed', { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
          throw error; // Re-throw original error
        }
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced since we have local cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2, // Reduced retries since we have fallback
    enabled: !!user,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (query.data && query.data !== cacheData) {
      setCacheData(query.data);
      serviceLogger.debug('Cache data updated in component state');
    }
  }, [query.data, cacheData]);
  
  const queryState = {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error?.message,
    dataLength: query.data?.videos.length || 0,
    status: query.status,
    fetchStatus: query.fetchStatus,
    fromCache: query.data?.fromCache || false,
    cacheStats: query.data?.cacheStats,
    lastSync: query.data?.lastSync ? new Date(query.data.lastSync).toISOString() : null,
  };

  serviceLogger.debug('Query state', queryState);

  // Function to remove videos from a specific channel
  const removeChannelVideos = async (channelId: string) => {
    serviceLogger.info('Removing videos from channel', { channelId });
    
    try {
      // Remove from cache
      const updatedVideos = await videoCacheService.removeChannelVideos(channelId);
      
      // Update TanStack Query cache
      query.refetch();
      
      serviceLogger.info('Successfully removed videos from channel', { channelId });
      return updatedVideos;
    } catch (error) {
      serviceLogger.error('Error removing channel videos', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  
  return {
    ...query,
    data: query.data?.videos || [],
    cacheData: query.data,
    queryState,
    removeChannelVideos, // Export the function
  };
};

// Export the original hook for backward compatibility
export { useVideoSummaries } from './useVideoSummaries';

// Transform function (reused from original hook)
export interface SummaryCardData {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  channelThumbnail: string;
  videoThumbnail: string;
  summary: string;
  createdAt: string;
  publishedAt: string;
  duration: string;
}

export const transformVideoSummaryToCardData = (
  video: VideoSummary, 
  channels: UserChannel[] = [],
  channelName?: string
): SummaryCardData => {
  // Find channel data from ChannelsContext first
  const channelData = channels.find(ch => ch.youtubeChannel.channelId === video.channelId);
  
  // Priority order for channel info:
  // 1. ChannelsContext data (most reliable, includes thumbnail)
  // 2. Video API response data 
  // 3. Parameter fallback
  // 4. Default
  const finalChannelName = channelData?.youtubeChannel.title || video.channelTitle || channelName || 'Unknown Channel';
  const finalChannelThumbnail = channelData?.youtubeChannel.thumbnail || 
    `https://via.placeholder.com/60/4285f4/ffffff?text=${finalChannelName.charAt(0) || 'C'}`;
  
  // Debug log to check thumbnail data sources
  serviceLogger.debug('transformVideoSummaryToCardData thumbnail debug', {
    videoTitle: video.title.substring(0, 30) + '...',
    channelId: video.channelId,
    channelFromContext: !!channelData,
    contextThumbnail: channelData?.youtubeChannel.thumbnail,
    finalThumbnail: finalChannelThumbnail,
    isPlaceholder: !channelData?.youtubeChannel.thumbnail
  });
  
  return {
    id: video.videoId,
    videoId: video.videoId,
    videoTitle: video.title,
    channelName: finalChannelName,
    channelThumbnail: finalChannelThumbnail,
    videoThumbnail: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
    summary: video.summary || '요약이 아직 생성되지 않았습니다.',
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    duration: '00:00',
  };
};