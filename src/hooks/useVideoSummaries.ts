import { useQuery } from '@tanstack/react-query';
import { apiService, VideoSummary } from '@/services/api';
import { serviceLogger } from '@/utils/logger-enhanced';

export const useVideoSummaries = () => {
  serviceLogger.debug('🔥 Hook being called', { hookName: 'useVideoSummaries' });
  
  const query = useQuery({
    queryKey: ['videoSummaries'], // Use stable query key
    queryFn: async () => {
      serviceLogger.debug('🔥 queryFn executing - API call starting', { hookName: 'useVideoSummaries' });
      serviceLogger.debug('🔥 API service initialized', { hasApiService: !!apiService });
      
      try {
        const response = await apiService.getVideoSummaries({ limit: 50, paginated: true });
        serviceLogger.debug('🔥 API response received', {
          hookName: 'useVideoSummaries',
          success: response.success,
          hasData: !!response.data,
          dataLength: response.data?.videos.length || 0
        });
        
        if (!response.success) {
          serviceLogger.error('🔥 API call failed', {
            hookName: 'useVideoSummaries',
            error: response.error
          });
          throw new Error(response.error || 'Failed to fetch video summaries');
        }
        
        serviceLogger.info('🔥 API call successful', {
          hookName: 'useVideoSummaries',
          videoCount: response.data?.videos.length || 0
        });
        return response.data.videos;
      } catch (error) {
        serviceLogger.error('🔥 API call error', {
          hookName: 'useVideoSummaries',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    enabled: true, // Explicitly enable the query
  });
  
  serviceLogger.debug('🔥 Query state', {
    hookName: 'useVideoSummaries',
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message,
    dataCount: query.data?.length || 0,
    status: query.status,
    fetchStatus: query.fetchStatus
  });
  
  return query;
};

// Transform VideoSummary to match SummaryCard interface
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
  isSummarized: boolean;
}

export const transformVideoSummaryToCardData = (
  video: VideoSummary, 
  channelName?: string
): SummaryCardData => {
  const finalChannelName = channelName || video.channelTitle || 'Unknown Channel';
  return {
    id: video.videoId,
    videoId: video.videoId,
    videoTitle: video.title,
    channelName: finalChannelName,
    channelThumbnail: `https://via.placeholder.com/60/ff6b6b/ffffff?text=${encodeURIComponent(finalChannelName.charAt(0))}`,
    videoThumbnail: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
    summary: video.summary || '요약이 아직 생성되지 않았습니다.',
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    duration: '00:00', // Duration not provided by API, would need additional YouTube API call
    isSummarized: video.isSummarized ?? !!video.summary,
  };
};
