import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { videoSummaryService } from '@/services/video-summary-service';
import { getVideoSummariesQueryKey, type CacheAwareData } from '@/services/video-summaries-sync';
import { useAuthStore } from '@/stores/auth-store';
import { uiLogger } from '@/utils/logger-enhanced';

interface UseVideoSummaryDetailOptions {
  fromNotification?: boolean;
}

export const useVideoSummaryDetail = (
  videoId?: string,
  options: UseVideoSummaryDetailOptions = {}
) => {
  const fromNotification = options.fromNotification ?? false;
  const pollCountRef = useRef(0);
  const maxPolls = 15;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    pollCountRef.current = 0;
  }, [videoId, fromNotification]);

  const query = useQuery({
    queryKey: ['videoSummaryDetail', videoId],
    queryFn: async () => {
      if (!videoId) {
        throw new Error('Missing videoId');
      }
      try {
        return await videoSummaryService.fetchSummaryWithCache(videoId);
      } finally {
        if (fromNotification) {
          pollCountRef.current += 1;
        }
      }
    },
    enabled: !!videoId,
    refetchOnWindowFocus: false,
    refetchInterval: (currentQuery) => {
      if (!fromNotification) {
        return false;
      }
      const data = currentQuery.state.data;
      if (data?.summary && data?.processed) {
        return false;
      }
      if (pollCountRef.current >= maxPolls) {
        return false;
      }
      return 2000;
    }
  });

  useEffect(() => {
    const data = query.data;
    if (!data || !user?.id) {
      return;
    }

    const queryKey = getVideoSummariesQueryKey(user.id);
    queryClient.setQueryData<CacheAwareData>(queryKey, (existing) => {
      if (!existing) {
        return existing;
      }

      let hasUpdate = false;
      const updatedVideos = existing.videos.map((video) => {
        if (video.videoId !== data.videoId) {
          return video;
        }
        hasUpdate = true;
        return { ...video, ...data };
      });

      return hasUpdate
        ? { ...existing, videos: updatedVideos, lastSync: Date.now() }
        : existing;
    });
  }, [query.data, queryClient, user?.id]);

  useEffect(() => {
    if (
      fromNotification &&
      pollCountRef.current >= maxPolls &&
      !(query.data?.summary && query.data.processed)
    ) {
      uiLogger.warn('Polling timeout - summary not ready', {
        videoId,
        pollCount: pollCountRef.current
      });
    }
  }, [fromNotification, query.data, query.dataUpdatedAt, videoId]);

  return query;
};
