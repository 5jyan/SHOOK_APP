import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiService, VideoSummary, UserChannel } from '@/services/api';
import { videoCacheService } from '@/services/video-cache';
import {
  type CacheAwareData,
  buildCursorFromVideos,
  getVideoSummariesQueryKey,
  videoSummariesSyncService
} from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { serviceLogger } from '@/utils/logger-enhanced';

interface UseVideoSummariesCachedOptions {
  refetchOnMount?: boolean;
  skipInitialFetch?: boolean;
}

export const useVideoSummariesCached = (options: UseVideoSummariesCachedOptions = {}) => {
  const { user } = useAuthStore();
  const [cacheData, setCacheData] = useState<CacheAwareData | null>(null);
  const [cachePrimed, setCachePrimed] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = getVideoSummariesQueryKey(user?.id);
  const skipInitialFetchRef = useRef(options.skipInitialFetch ?? false);
  
  serviceLogger.debug('useVideoSummariesCached hook called');
  
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CacheAwareData> => {
      if (skipInitialFetchRef.current) {
        skipInitialFetchRef.current = false;
        serviceLogger.info('Skipping initial network sync; using cached summaries only');
        return videoSummariesSyncService.getCachedData();
      }
      return videoSummariesSyncService.sync({ userId: user?.id, existingCursor: nextCursor });
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced since we have local cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: options.refetchOnMount ?? true, // Always revalidate on mount (SWR)
    retry: 2, // Reduced retries since we have fallback
    enabled: true,
  });

  useEffect(() => {
    setCacheData(null);
    setCachePrimed(false);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const primeCache = async () => {
      if (query.data) {
        if (!cancelled) {
          setCachePrimed(true);
        }
        return;
      }

      try {
        const cachedData = await videoSummariesSyncService.getCachedData();
        if (cachedData.videos.length === 0) {
          if (!cancelled) {
            setCachePrimed(true);
          }
          return;
        }

        if (cancelled) {
          return;
        }

        const primedData: CacheAwareData = {
          ...cachedData,
          videos: cachedData.videos
        };
        primedData.nextCursor = buildCursorFromVideos(cachedData.videos);
        queryClient.setQueryData(queryKey, primedData);
        setCacheData(primedData);
        setCachePrimed(true);
      } catch (error) {
        serviceLogger.error('Failed to prime video summaries cache', {
          error: error instanceof Error ? error.message : String(error)
        });
        if (!cancelled) {
          setCachePrimed(true);
        }
      }
    };

    primeCache();

    return () => {
      cancelled = true;
    };
  }, [query.data, queryClient, user?.id]);

  // Update local state when query data changes
  useEffect(() => {
    if (query.data && query.data !== cacheData) {
      setCacheData(query.data);
      serviceLogger.debug('Cache data updated in component state');
    }
  }, [query.data, cacheData]);

  useEffect(() => {
    if (query.data && query.data.nextCursor !== nextCursor) {
      setNextCursor(query.data.nextCursor);
    }
  }, [query.data, nextCursor]);
  
  const effectiveCacheData = query.data ?? cacheData;
  const queryState = {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error?.message,
    dataLength: effectiveCacheData?.videos.length || 0,
    status: query.status,
    fetchStatus: query.fetchStatus,
    fromCache: effectiveCacheData?.fromCache || false,
    cacheStats: effectiveCacheData?.cacheStats,
    lastSync: effectiveCacheData?.lastSync ? new Date(effectiveCacheData.lastSync).toISOString() : null,
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

  const fetchNextPage = async () => {
    if (!nextCursor || isFetchingMore) {
      return;
    }

    setIsFetchingMore(true);
    serviceLogger.info('Fetching next video summaries page', { cursor: nextCursor });

    try {
      const response = await apiService.getVideoSummaries({
        cursor: nextCursor,
        limit: 50,
        paginated: true
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch more video summaries');
      }

      const page = response.data;
      if (page.videos.length === 0) {
        setNextCursor(null);
        return;
      }

      const mergedVideos = await videoCacheService.mergeVideos(page.videos);
      const updatedCacheStats = await videoCacheService.getCacheStats();

      const updatedData: CacheAwareData = {
        videos: mergedVideos,
        fromCache: false,
        lastSync: Date.now(),
        nextCursor: page.nextCursor,
        cacheStats: {
          totalEntries: updatedCacheStats.totalEntries,
          cacheSize: updatedCacheStats.cacheSize,
          lastSync: updatedCacheStats.lastSync,
        }
      };

      queryClient.setQueryData(queryKey, updatedData);
      setNextCursor(page.nextCursor);
      serviceLogger.info('Fetched next page successfully', {
        newVideos: page.videos.length,
        totalVideos: mergedVideos.length,
        hasNextPage: !!page.nextCursor
      });
    } catch (error) {
      serviceLogger.error('Failed to fetch next page', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsFetchingMore(false);
    }
  };
  
  return {
    ...query,
    data: effectiveCacheData?.videos || [],
    cacheData: effectiveCacheData,
    cachePrimed,
    queryState,
    removeChannelVideos, // Export the function
    fetchNextPage,
    hasNextPage: !!nextCursor,
    isFetchingNextPage: isFetchingMore,
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
  // 2. Video API response data (channelThumbnail field from backend)
  // 3. Parameter fallback
  // 4. Default placeholder
  const finalChannelName = channelData?.youtubeChannel.title || video.channelTitle || channelName || 'Unknown Channel';
  const finalChannelThumbnail = channelData?.youtubeChannel.thumbnail ||
    video.channelThumbnail || // USE BACKEND THUMBNAIL IF AVAILABLE
    `https://via.placeholder.com/60/4285f4/ffffff?text=${finalChannelName.charAt(0) || 'C'}`;

  // Debug log to check thumbnail data sources
  serviceLogger.debug('transformVideoSummaryToCardData thumbnail debug', {
    videoTitle: video.title.substring(0, 30) + '...',
    channelId: video.channelId,
    channelFromContext: !!channelData,
    contextThumbnail: channelData?.youtubeChannel.thumbnail,
    videoThumbnail: video.channelThumbnail, // LOG BACKEND THUMBNAIL
    finalThumbnail: finalChannelThumbnail,
    isPlaceholder: !channelData?.youtubeChannel.thumbnail && !video.channelThumbnail
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
