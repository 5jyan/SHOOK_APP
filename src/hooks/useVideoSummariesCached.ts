import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiService, VideoSummary } from '@/services/api';
import { videoCacheService } from '@/services/video-cache';
import { useAuthStore } from '@/stores/auth-store';

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
  
  console.log('📦 [useVideoSummariesCached] Hook being called');
  
  const query = useQuery({
    queryKey: ['videoSummariesCached', user?.id],
    queryFn: async (): Promise<CacheAwareData> => {
      console.log('📦 [useVideoSummariesCached] queryFn executing - hybrid cache strategy starting...');
      const startTime = Date.now();
      
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Check if user changed (clear cache if needed)
        await videoCacheService.checkUserChanged(parseInt(user.id));

        // Step 1: Load cached data immediately for instant UI update
        console.log('📦 [useVideoSummariesCached] Step 1: Loading cached data...');
        const cachedVideos = await videoCacheService.getCachedVideos();
        const cacheStats = await videoCacheService.getCacheStats();
        
        console.log(`📦 [useVideoSummariesCached] Cached data loaded: ${cachedVideos.length} videos (${Date.now() - startTime}ms)`);

        // Step 2: Get last sync timestamp for incremental sync
        const lastSyncTimestamp = await videoCacheService.getLastSyncTimestamp();
        console.log(`📦 [useVideoSummariesCached] Last sync: ${new Date(lastSyncTimestamp).toISOString()}`);

        // Step 3: Determine sync strategy
        const cacheAge = Date.now() - lastSyncTimestamp;
        const FULL_SYNC_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
        const shouldFullSync = cacheAge > FULL_SYNC_THRESHOLD || lastSyncTimestamp === 0;

        if (shouldFullSync) {
          console.log(`📦 [useVideoSummariesCached] Full sync required (cache age: ${Math.round(cacheAge / (1000 * 60 * 60))}h)`);
        } else {
          console.log(`📦 [useVideoSummariesCached] Incremental sync (cache age: ${Math.round(cacheAge / (1000 * 60))}m)`);
        }

        // Step 4: Fetch new/updated data from server
        let serverResponse;
        let finalVideos: VideoSummary[];

        if (shouldFullSync) {
          // Full sync - get all videos
          console.log('📦 [useVideoSummariesCached] Performing full sync...');
          serverResponse = await apiService.getVideoSummaries();
          
          if (!serverResponse.success) {
            console.error('📦 [useVideoSummariesCached] Full sync failed:', serverResponse.error);
            throw new Error(serverResponse.error || 'Failed to fetch video summaries');
          }

          finalVideos = serverResponse.data;
          
          // Replace entire cache
          await videoCacheService.saveVideosToCache(finalVideos);
          console.log(`📦 [useVideoSummariesCached] Full sync completed: ${finalVideos.length} videos cached`);
        } else {
          // Incremental sync - get only new videos
          console.log('📦 [useVideoSummariesCached] Performing incremental sync...');
          serverResponse = await apiService.getVideoSummaries(lastSyncTimestamp);
          
          if (!serverResponse.success) {
            console.error('📦 [useVideoSummariesCached] Incremental sync failed:', serverResponse.error);
            throw new Error(serverResponse.error || 'Failed to fetch new video summaries');
          }

          const newVideos = serverResponse.data;
          console.log(`📦 [useVideoSummariesCached] Incremental sync received ${newVideos.length} new videos`);

          if (newVideos.length > 0) {
            // Merge new videos with cached ones
            finalVideos = await videoCacheService.mergeVideos(newVideos);
            console.log(`📦 [useVideoSummariesCached] Cache merged: ${finalVideos.length} total videos`);
          } else {
            // No new videos, use cached data
            finalVideos = cachedVideos;
            console.log('📦 [useVideoSummariesCached] No new videos, using cached data');
            
            // Update last sync timestamp even if no new videos
            await videoCacheService.updateCacheMetadata({ lastSyncTimestamp: Date.now() } as any);
          }
        }

        // Step 5: Get updated cache stats
        const updatedCacheStats = await videoCacheService.getCacheStats();
        const totalTime = Date.now() - startTime;

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

        console.log(`📦 [useVideoSummariesCached] Hybrid sync completed in ${totalTime}ms:`, {
          totalVideos: finalVideos.length,
          fromCache: result.fromCache,
          cacheSize: `${updatedCacheStats.cacheSize}KB`,
          syncType: shouldFullSync ? 'full' : 'incremental',
          networkVideos: shouldFullSync ? finalVideos.length : serverResponse.data.length
        });

        return result;
      } catch (error) {
        console.error('📦 [useVideoSummariesCached] Hybrid sync error:', error);
        
        // Fallback: try to return cached data on error
        try {
          const fallbackVideos = await videoCacheService.getCachedVideos();
          const fallbackStats = await videoCacheService.getCacheStats();
          
          console.log(`📦 [useVideoSummariesCached] Using cached fallback: ${fallbackVideos.length} videos`);
          
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
          console.error('📦 [useVideoSummariesCached] Fallback also failed:', fallbackError);
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
      console.log('📦 [useVideoSummariesCached] Cache data updated in component state');
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

  console.log('📦 [useVideoSummariesCached] Query state:', queryState);
  
  return {
    ...query,
    data: query.data?.videos || [],
    cacheData: query.data,
    queryState,
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
  channelName?: string
): SummaryCardData => {
  // Use channelTitle from API response, fallback to channelName parameter, then "Unknown Channel"
  const finalChannelName = video.channelTitle || channelName || 'Unknown Channel';
  
  return {
    id: video.videoId,
    videoId: video.videoId,
    videoTitle: video.title,
    channelName: finalChannelName,
    channelThumbnail: `https://via.placeholder.com/60/4285f4/ffffff?text=${finalChannelName.charAt(0) || 'C'}`,
    videoThumbnail: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
    summary: video.summary || '요약이 아직 생성되지 않았습니다.',
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    duration: '00:00',
  };
};