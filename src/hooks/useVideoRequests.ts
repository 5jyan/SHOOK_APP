import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiService, type VideoSummary } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

const videoRequestsQueryKey = (userId?: string | number) => ['videoRequests', userId] as const;

export function useVideoRequests() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: videoRequestsQueryKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const response = await apiService.getRequestedVideoSummaries();
      if (!response.success) {
        throw new Error(response.error || '요청한 영상 목록을 불러오지 못했습니다.');
      }
      return response.data;
    },
    refetchInterval: (currentQuery) => {
      const videos = currentQuery.state.data;
      return videos?.some((video) => ['pending', 'processing'].includes(video.processingStatus ?? ''))
        ? 4000
        : false;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (url: string): Promise<VideoSummary> => {
      const response = await apiService.requestVideoSummary(url);
      if (!response.success) {
        throw new Error(response.error || '영상 요약 요청을 시작하지 못했습니다.');
      }
      return response.data;
    },
    onSuccess: (video) => {
      queryClient.setQueryData<VideoSummary[]>(videoRequestsQueryKey(userId), (current = []) => [
        video,
        ...current.filter((item) => item.videoId !== video.videoId),
      ]);
      void queryClient.invalidateQueries({ queryKey: videoRequestsQueryKey(userId) });
    },
  });

  return { ...query, requestSummary: requestMutation.mutateAsync, isRequesting: requestMutation.isPending };
}
