import { apiService, type VideoSummary } from '@/services/api';
import { videoCacheService } from '@/services/video-cache';
import { serviceLogger } from '@/utils/logger-enhanced';

export class VideoSummaryService {
  async getCachedSummaryById(videoId: string): Promise<VideoSummary | null> {
    const cachedVideos = await videoCacheService.getCachedVideos();
    return cachedVideos.find(video => video.videoId === videoId) ?? null;
  }

  async fetchSummaryById(videoId: string): Promise<VideoSummary> {
    const response = await apiService.getVideoSummaryById(videoId);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch video summary');
    }

    try {
      await videoCacheService.mergeVideos([response.data]);
    } catch (error) {
      serviceLogger.warn('Failed to merge fetched summary into cache', {
        videoId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return response.data;
  }

  async fetchSummaryWithCache(videoId: string): Promise<VideoSummary> {
    const cached = await this.getCachedSummaryById(videoId);

    try {
      return await this.fetchSummaryById(videoId);
    } catch (error) {
      if (cached) {
        serviceLogger.warn('Using cached summary after fetch failure', {
          videoId,
          error: error instanceof Error ? error.message : String(error)
        });
        return cached;
      }
      throw error;
    }
  }
}

export const videoSummaryService = new VideoSummaryService();
