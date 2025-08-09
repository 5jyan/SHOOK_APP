import { useQuery } from '@tanstack/react-query';
import { apiService, VideoSummary } from '@/services/api';

export const useVideoSummaries = () => {
  console.log('🔥 [useVideoSummaries] Hook being called');
  
  const query = useQuery({
    queryKey: ['videoSummaries'], // Use stable query key
    queryFn: async () => {
      console.log('🔥 [useVideoSummaries] queryFn executing - API call starting...');
      console.log('🔥 [useVideoSummaries] API service:', apiService);
      
      try {
        const response = await apiService.getVideoSummaries();
        console.log('🔥 [useVideoSummaries] API response received:', response);
        
        if (!response.success) {
          console.error('🔥 [useVideoSummaries] API call failed:', response.error);
          throw new Error(response.error || 'Failed to fetch video summaries');
        }
        
        console.log('🔥 [useVideoSummaries] API call successful, data:', response.data);
        return response.data;
      } catch (error) {
        console.error('🔥 [useVideoSummaries] API call error:', error);
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
  
  console.log('🔥 [useVideoSummaries] Query state:', {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error?.message,
    data: query.data?.length || 0,
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
}

export const transformVideoSummaryToCardData = (
  video: VideoSummary, 
  channelName?: string
): SummaryCardData => {
  return {
    id: video.videoId,
    videoId: video.videoId,
    videoTitle: video.title,
    channelName: channelName || 'Unknown Channel',
    channelThumbnail: `https://via.placeholder.com/60/4285f4/ffffff?text=${channelName?.charAt(0) || 'C'}`,
    videoThumbnail: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
    summary: video.summary || '요약이 아직 생성되지 않았습니다.',
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    duration: '00:00', // Duration not provided by API, would need additional YouTube API call
  };
};