import type { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService, type VideoSummary } from '@/services/api';
import { videoCacheService } from '@/services/video-cache';
import { serviceLogger } from '@/utils/logger-enhanced';

export interface CacheAwareData {
  videos: VideoSummary[];
  fromCache: boolean;
  lastSync: number;
  nextCursor: string | null;
  cacheStats: {
    totalEntries: number;
    cacheSize: number;
    lastSync: number;
  };
}

const toCacheAwareData = (
  videos: VideoSummary[],
  cacheStats: { totalEntries: number; cacheSize: number; lastSync: number }
): CacheAwareData => ({
  videos,
  fromCache: true,
  lastSync: cacheStats.lastSync,
  nextCursor: null,
  cacheStats: {
    totalEntries: cacheStats.totalEntries,
    cacheSize: cacheStats.cacheSize,
    lastSync: cacheStats.lastSync,
  }
});

export const buildCursorFromVideos = (videos: VideoSummary[]): string | null => {
  if (videos.length === 0) {
    return null;
  }

  const sorted = [...videos].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return b.videoId.localeCompare(a.videoId);
  });
  const lastVideo = sorted[sorted.length - 1];
  if (!lastVideo) {
    return null;
  }
  return `${new Date(lastVideo.createdAt).getTime()}_${lastVideo.videoId}`;
};

export const getVideoSummariesQueryKey = (userId?: string | null) =>
  ['videoSummariesCached', userId ?? null] as const;

interface SyncOptions {
  userId?: string | null | undefined;
  existingCursor?: string | null | undefined;
}

interface BackgroundSyncOptions extends SyncOptions {
  queryClient?: QueryClient;
  reason?: string;
  force?: boolean;
}

export class VideoSummariesSyncService {
  private readonly minSyncIntervalMs = 60_000;
  private readonly syncStateKeyPrefix = 'video_summaries_sync_state';
  private inFlightSyncs = new Map<string, Promise<CacheAwareData>>();

  private getSyncStateKey(userId: string): string {
    return `${this.syncStateKeyPrefix}:${userId}`;
  }

  private async getSyncState(userId: string): Promise<{ lastCheckedAt: number; dirty: boolean }> {
    try {
      const rawState = await AsyncStorage.getItem(this.getSyncStateKey(userId));
      if (!rawState) {
        return { lastCheckedAt: 0, dirty: false };
      }
      const state = JSON.parse(rawState) as Partial<{ lastCheckedAt: number; dirty: boolean }>;
      return {
        lastCheckedAt: typeof state.lastCheckedAt === 'number' ? state.lastCheckedAt : 0,
        dirty: state.dirty === true,
      };
    } catch (error) {
      serviceLogger.warn('Failed to read video summary sync state', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { lastCheckedAt: 0, dirty: false };
    }
  }

  private async saveSyncState(userId: string, state: { lastCheckedAt: number; dirty: boolean }): Promise<void> {
    await AsyncStorage.setItem(this.getSyncStateKey(userId), JSON.stringify(state));
  }

  async markSyncNeeded(userId?: string | null): Promise<void> {
    if (!userId) return;
    const state = await this.getSyncState(userId);
    await this.saveSyncState(userId, { ...state, dirty: true });
  }

  async getCachedData(): Promise<CacheAwareData> {
    const cachedVideos = await videoCacheService.getCachedVideos();
    const cacheStats = await videoCacheService.getCacheStats();
    const data = toCacheAwareData(cachedVideos, cacheStats);
    data.nextCursor = buildCursorFromVideos(cachedVideos);
    return data;
  }

  async publishCachedData(queryClient: QueryClient, userId?: string | null): Promise<CacheAwareData> {
    const data = await this.getCachedData();
    queryClient.setQueryData(getVideoSummariesQueryKey(userId), data);
    return data;
  }

  async sync({ userId, existingCursor }: SyncOptions): Promise<CacheAwareData> {
    const timerId = serviceLogger.startTimer('hybrid-cache-strategy');
    serviceLogger.info('Video summaries sync starting', { userId });

    try {
      if (!userId) {
        serviceLogger.warn('No authenticated user, using cached video summaries only');
        const data = await this.getCachedData();

        serviceLogger.endTimer(timerId, 'Hybrid sync completed (no user)');
        return data;
      }

      const numericUserId = parseInt(userId, 10);
      if (Number.isNaN(numericUserId)) {
        throw new Error('Invalid user ID format');
      }

      // Check if user changed (clear cache if needed)
      await videoCacheService.checkUserChanged(numericUserId);

      // Step 1: Load cached data immediately for instant UI update
      serviceLogger.debug('Step 1: Loading cached data');
      const cachedVideos = await videoCacheService.getCachedVideos();
      const cacheStats = await videoCacheService.getCacheStats();

      serviceLogger.info('Cached data loaded', { videoCount: cachedVideos.length });

      // Step 2: Get last sync timestamp for incremental sync
      const lastSyncTimestamp = await videoCacheService.getLastSyncTimestamp();
      serviceLogger.debug('Last sync timestamp', { lastSync: new Date(lastSyncTimestamp).toISOString() });

      // Step 3: Determine sync strategy based on channel changes
      const channelListChanged = await videoCacheService.hasChannelListChanged();
      const shouldFullSync = channelListChanged || lastSyncTimestamp === 0;

      if (shouldFullSync) {
        if (channelListChanged) {
          serviceLogger.info('Full sync required - channel list changed');
        } else {
          serviceLogger.info('Full sync required - first time sync');
        }
      } else {
        serviceLogger.info('Incremental sync - no channel changes detected');
      }

      // Step 4: Fetch new/updated data from server
      let serverResponse;
      let finalVideos: VideoSummary[];
      let nextCursorFromSync: string | null = null;

      if (shouldFullSync) {
        // Full sync - get all videos
        serviceLogger.info('Performing full sync');
        serverResponse = await apiService.getVideoSummaries({ limit: 50, paginated: true });

        if (!serverResponse.success) {
          serviceLogger.error('Full sync failed', { error: serverResponse.error });
          throw new Error(serverResponse.error || 'Failed to fetch video summaries');
        }

        finalVideos = serverResponse.data.videos;
        nextCursorFromSync = serverResponse.data.nextCursor;

        // Merge to preserve unsummarized local videos (e.g., newly added channels)
        finalVideos = await videoCacheService.mergeVideos(finalVideos);

        // Clear channel change signal after successful full sync
        if (channelListChanged) {
          await videoCacheService.clearChannelChangeSignal();
          serviceLogger.info('Channel change signal cleared after full sync');
        }

        serviceLogger.info('Full sync completed', { videosCached: finalVideos.length });
      } else {
        // Incremental sync - get only new videos
        serviceLogger.info('Performing incremental sync');
        serverResponse = await apiService.getVideoSummaries({ since: lastSyncTimestamp, limit: 50, paginated: true });

        if (!serverResponse.success) {
          serviceLogger.error('Incremental sync failed', { error: serverResponse.error });
          throw new Error(serverResponse.error || 'Failed to fetch new video summaries');
        }

        const newVideos = serverResponse.data.videos;
        serviceLogger.info('Incremental sync received new videos', { newVideoCount: newVideos.length });

        if (newVideos.length > 0) {
          // Merge new videos with cached ones
          finalVideos = await videoCacheService.mergeVideos(newVideos);
          serviceLogger.info('Cache merged', { totalVideos: finalVideos.length });
        } else {
          // No new videos, use cached data
          finalVideos = cachedVideos;
          serviceLogger.info('No new videos, using cached data');

          // No timestamp update needed when no new videos received
          serviceLogger.debug('No timestamp update needed - no new videos received');
        }
      }

      // Step 5: Optional cache maintenance (retention disabled)
      const cleanedCount = await videoCacheService.cleanOldVideos();
      if (cleanedCount > 0) {
        serviceLogger.info('Cleaned old videos during sync', { cleanedCount });
      }

      // Step 6: Get updated cache stats
      const updatedCacheStats = await videoCacheService.getCacheStats();

      const result: CacheAwareData = {
        videos: finalVideos,
        fromCache: !shouldFullSync && serverResponse.data.videos.length === 0,
        lastSync: Date.now(),
        nextCursor: shouldFullSync ? nextCursorFromSync : (existingCursor ?? buildCursorFromVideos(finalVideos)),
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
        networkVideos: shouldFullSync ? finalVideos.length : serverResponse.data.videos.length
      });

      return result;
    } catch (error) {
      serviceLogger.endTimer(timerId, 'Hybrid sync failed');
      serviceLogger.error('Hybrid sync error', { error: error instanceof Error ? error.message : String(error) });

      // Fallback: try to return cached data on error
      try {
        const data = await this.getCachedData();
        serviceLogger.info('Using cached fallback', { videoCount: data.videos.length });
        return data;
      } catch (fallbackError) {
        serviceLogger.error('Fallback also failed', { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
        throw error; // Re-throw original error
      }
    }
  }

  async syncInBackground({ userId, existingCursor, queryClient, reason }: BackgroundSyncOptions): Promise<CacheAwareData> {
    serviceLogger.info('Background video summaries sync requested', { reason, userId });
    const result = await this.sync({ userId, existingCursor });

    if (queryClient) {
      queryClient.setQueryData(getVideoSummariesQueryKey(userId), result);
    }

    return result;
  }

  async syncIfNeeded({
    userId,
    existingCursor,
    queryClient,
    reason,
    force = false,
  }: BackgroundSyncOptions): Promise<CacheAwareData> {
    if (!userId) {
      return this.getCachedData();
    }

    const existingSync = this.inFlightSyncs.get(userId);
    if (existingSync) {
      serviceLogger.debug('Joining video summaries sync already in progress', { reason });
      return existingSync;
    }

    const state = await this.getSyncState(userId);
    const syncStartedDuringStateCheck = this.inFlightSyncs.get(userId);
    if (syncStartedDuringStateCheck) {
      serviceLogger.debug('Joining video summaries sync started during state check', { reason });
      return syncStartedDuringStateCheck;
    }
    const elapsedMs = Date.now() - state.lastCheckedAt;
    if (!force && !state.dirty && elapsedMs < this.minSyncIntervalMs) {
      serviceLogger.debug('Skipping recent video summaries sync', { reason, elapsedMs });
      return queryClient?.getQueryData<CacheAwareData>(getVideoSummariesQueryKey(userId))
        ?? this.getCachedData();
    }

    const syncPromise = this.syncInBackground({
      userId,
      existingCursor,
      ...(queryClient ? { queryClient } : {}),
      ...(reason ? { reason } : {}),
    });
    this.inFlightSyncs.set(userId, syncPromise);

    try {
      const result = await syncPromise;
      await this.saveSyncState(userId, { lastCheckedAt: Date.now(), dirty: false });
      return result;
    } finally {
      if (this.inFlightSyncs.get(userId) === syncPromise) {
        this.inFlightSyncs.delete(userId);
      }
    }
  }
}

export const videoSummariesSyncService = new VideoSummariesSyncService();
