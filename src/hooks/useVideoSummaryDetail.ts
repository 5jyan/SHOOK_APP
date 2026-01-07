import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { videoSummaryService } from '@/services/video-summary-service';
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

  useEffect(() => {
    pollCountRef.current = 0;
  }, [videoId, fromNotification]);

  return useQuery({
    queryKey: ['videoSummaryDetail', videoId],
    queryFn: async () => {
      if (!videoId) {
        throw new Error('Missing videoId');
      }
      return videoSummaryService.fetchSummaryWithCache(videoId);
    },
    enabled: !!videoId,
    refetchOnWindowFocus: false,
    refetchInterval: (data) => {
      if (!fromNotification) {
        return false;
      }
      if (data?.summary && data?.processed) {
        return false;
      }
      if (pollCountRef.current >= maxPolls) {
        return false;
      }
      return 2000;
    },
    onSettled: (data) => {
      if (!fromNotification) {
        return;
      }
      if (data?.summary && data?.processed) {
        return;
      }
      pollCountRef.current += 1;
      if (pollCountRef.current >= maxPolls) {
        uiLogger.warn('Polling timeout - summary not ready', {
          videoId,
          pollCount: pollCountRef.current
        });
      }
    }
  });
};
