// Legacy Video Summary Cache Service - DEPRECATED
// Use video-cache-enhanced.ts for new features and better reliability
import { videoCacheService as enhancedCacheService } from './video-cache-enhanced';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoSummary } from './api';
import { cacheLogger } from '@/utils/logger-enhanced';

interface CacheEntry {
  videoId: string;
  data: VideoSummary;
  cachedAt: number;
  channelId: string;
}

interface CacheMetadata {
  lastSyncTimestamp: number;
  totalVideos: number;
  cacheVersion: string;
  userId: number | null;
}

interface CacheStats {
  totalEntries: number;
  cacheSize: number; // in KB
  oldestEntry: number;
  newestEntry: number;
  lastSync: number;
}

export class VideoCacheService {
  private static instance: VideoCacheService;
  private readonly CACHE_VERSION = '1.0.0';
  
  // Cache keys
  private readonly CACHE_KEYS = {
    VIDEO_LIST: 'video_summaries_cache',
    METADATA: 'video_cache_metadata',
    CHANNEL_MAPPING: 'channel_names_cache',
  };

  // Cache configuration
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_ENTRIES = 500; // Maximum number of videos to cache

  private constructor() {}

  static getInstance(): VideoCacheService {
    if (!VideoCacheService.instance) {
      VideoCacheService.instance = new VideoCacheService();
    }
    return VideoCacheService.instance;
  }

  // Get cache metadata
  private async getCacheMetadata(): Promise<CacheMetadata> {
    cacheLogger.debug('Getting cache metadata');
    
    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (metadataString) {
        const metadata = JSON.parse(metadataString) as CacheMetadata;
        cacheLogger.debug('Found metadata', {
          lastSync: new Date(metadata.lastSyncTimestamp).toISOString(),
          totalVideos: metadata.totalVideos,
          version: metadata.cacheVersion,
          userId: metadata.userId
        });
        return metadata;
      }
    } catch (error) {
      cacheLogger.error('Error reading metadata', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    // Return default metadata
    const defaultMetadata: CacheMetadata = {
      lastSyncTimestamp: 0,
      totalVideos: 0,
      cacheVersion: this.CACHE_VERSION,
      userId: null,
    };
    
    cacheLogger.debug('Using default metadata');
    return defaultMetadata;
  }

  // Update cache metadata
  private async updateCacheMetadata(updates: Partial<CacheMetadata>): Promise<void> {
    cacheLogger.debug('Updating metadata', updates);
    
    try {
      const currentMetadata = await this.getCacheMetadata();
      const newMetadata: CacheMetadata = {
        ...currentMetadata,
        ...updates,
      };

      await AsyncStorage.setItem(
        this.CACHE_KEYS.METADATA,
        JSON.stringify(newMetadata)
      );
      
      cacheLogger.debug('Metadata updated successfully');
    } catch (error) {
      cacheLogger.error('Error updating metadata', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // Get all cached videos
  async getCachedVideos(): Promise<VideoSummary[]> {
    const startTime = Date.now();
    
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      
      if (!cachedData) {
        cacheLogger.debug('No cached data found');
        return [];
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      const currentTime = Date.now();
      
      // Filter out expired entries
      const validEntries = cacheEntries.filter(entry => {
        const age = currentTime - entry.cachedAt;
        const isValid = age < this.MAX_CACHE_AGE;
        
        if (!isValid) {
          cacheLogger.debug('Expired entry removed', { 
            videoId: entry.videoId, 
            ageHours: Math.round(age / (1000 * 60 * 60)) 
          });
        }
        
        return isValid;
      });

      // Sort by createdAt (when video was processed - newest first)
      validEntries.sort((a, b) => 
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
      );

      const videos = validEntries.map(entry => entry.data);
      const loadTime = Date.now() - startTime;
      
      cacheLogger.info('Loaded videos from cache', {
        videoCount: videos.length,
        loadTimeMs: loadTime,
        expiredRemoved: cacheEntries.length - validEntries.length
      });

      // Update cache if we removed expired entries
      if (cacheEntries.length !== validEntries.length) {
        await this.saveVideosToCache(videos);
      }

      return videos;
    } catch (error) {
      cacheLogger.error('Error reading cached videos', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  // Save videos to cache
  async saveVideosToCache(videos: VideoSummary[]): Promise<void> {
    cacheLogger.debug('Saving videos to cache', { videoCount: videos.length });
    const startTime = Date.now();
    
    try {
      const currentTime = Date.now();
      const cacheEntries: CacheEntry[] = videos.map(video => ({
        videoId: video.videoId,
        data: video,
        cachedAt: currentTime,
        channelId: video.channelId,
      }));

      // Limit cache size
      const limitedEntries = cacheEntries.slice(0, this.MAX_ENTRIES);
      
      if (cacheEntries.length > this.MAX_ENTRIES) {
        cacheLogger.info('Limited cache size', { maxEntries: this.MAX_ENTRIES, originalCount: cacheEntries.length });
      }

      await AsyncStorage.setItem(
        this.CACHE_KEYS.VIDEO_LIST,
        JSON.stringify(limitedEntries)
      );

      // Update metadata
      await this.updateCacheMetadata({
        totalVideos: limitedEntries.length,
        lastSyncTimestamp: currentTime,
      });

      const saveTime = Date.now() - startTime;
      const cacheSize = JSON.stringify(limitedEntries).length / 1024; // KB
      
      cacheLogger.info('Cache saved successfully', { saveTimeMs: saveTime, cacheSizeKB: cacheSize.toFixed(1) });
    } catch (error) {
      cacheLogger.error('Error saving to cache', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Merge new videos with cached ones (incremental update)
  async mergeVideos(newVideos: VideoSummary[]): Promise<VideoSummary[]> {
    cacheLogger.debug('Merging new videos with cache', { newVideoCount: newVideos.length });
    const startTime = Date.now();
    
    try {
      const cachedVideos = await this.getCachedVideos();
      const cachedVideoIds = new Set(cachedVideos.map(v => v.videoId));
      
      // Filter out videos that are already cached
      const actuallyNewVideos = newVideos.filter(video => !cachedVideoIds.has(video.videoId));
      
      cacheLogger.debug('Video merge analysis', { actuallyNew: actuallyNewVideos.length, alreadyCached: newVideos.length - actuallyNewVideos.length });
      
      // Combine and sort by createdAt (when video was processed)
      const allVideos = [...actuallyNewVideos, ...cachedVideos];
      allVideos.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Save merged data
      await this.saveVideosToCache(allVideos);
      
      const mergeTime = Date.now() - startTime;
      cacheLogger.info('Video merge completed', { mergeTimeMs: mergeTime, totalVideos: allVideos.length });
      
      return allVideos;
    } catch (error) {
      cacheLogger.error('Error merging videos', { error: error instanceof Error ? error.message : String(error) });
      return newVideos; // Fallback to new videos only
    }
  }

  // Get last sync timestamp
  async getLastSyncTimestamp(): Promise<number> {
    const metadata = await this.getCacheMetadata();
    cacheLogger.debug('Retrieved last sync timestamp', { lastSync: new Date(metadata.lastSyncTimestamp).toISOString() });
    return metadata.lastSyncTimestamp;
  }

  // Clear cache (for logout or cache reset)
  async clearCache(): Promise<void> {
    cacheLogger.info('Clearing cache');
    
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEYS.VIDEO_LIST,
        this.CACHE_KEYS.METADATA,
        this.CACHE_KEYS.CHANNEL_MAPPING,
      ]);
      
      cacheLogger.info('Cache cleared successfully');
    } catch (error) {
      cacheLogger.error('Error clearing cache', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<CacheStats> {
    cacheLogger.debug('Getting cache statistics');
    
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      const metadata = await this.getCacheMetadata();
      
      if (!cachedData) {
        return {
          totalEntries: 0,
          cacheSize: 0,
          oldestEntry: 0,
          newestEntry: 0,
          lastSync: metadata.lastSyncTimestamp,
        };
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      const cacheSize = cachedData.length / 1024; // KB
      
      const timestamps = cacheEntries.map(entry => entry.cachedAt);
      const oldestEntry = Math.min(...timestamps);
      const newestEntry = Math.max(...timestamps);

      const stats: CacheStats = {
        totalEntries: cacheEntries.length,
        cacheSize: Math.round(cacheSize * 10) / 10,
        oldestEntry,
        newestEntry,
        lastSync: metadata.lastSyncTimestamp,
      };

      cacheLogger.debug('Cache statistics retrieved', {
        totalEntries: stats.totalEntries,
        cacheSizeKB: stats.cacheSize,
        oldestEntry: new Date(stats.oldestEntry).toISOString(),
        newestEntry: new Date(stats.newestEntry).toISOString(),
        lastSync: new Date(stats.lastSync).toISOString(),
      });

      return stats;
    } catch (error) {
      cacheLogger.error('Error getting cache stats', { error: error instanceof Error ? error.message : String(error) });
      return {
        totalEntries: 0,
        cacheSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        lastSync: 0,
      };
    }
  }

  // Check if user changed (for cache invalidation)
  async checkUserChanged(currentUserId: number): Promise<boolean> {
    const metadata = await this.getCacheMetadata();
    
    if (metadata.userId !== currentUserId) {
      cacheLogger.info('User changed, clearing cache', { oldUserId: metadata.userId, newUserId: currentUserId });
      await this.clearCache();
      await this.updateCacheMetadata({ userId: currentUserId });
      return true;
    }
    
    return false;
  }

  // Remove videos from a specific channel
  async removeChannelVideos(channelId: string): Promise<VideoSummary[]> {
    cacheLogger.debug('Removing videos from channel', { channelId });
    const startTime = Date.now();
    
    try {
      const cachedVideos = await this.getCachedVideos();
      
      // Filter out videos from the specified channel
      const remainingVideos = cachedVideos.filter(video => video.channelId !== channelId);
      const removedCount = cachedVideos.length - remainingVideos.length;
      
      cacheLogger.info('Removed videos from channel', { channelId, removedCount });
      
      if (removedCount > 0) {
        // Save updated cache
        await this.saveVideosToCache(remainingVideos);
        
        const removeTime = Date.now() - startTime;
        cacheLogger.debug('Channel videos removal completed', { removeTimeMs: removeTime });
      }
      
      return remainingVideos;
    } catch (error) {
      cacheLogger.error('Error removing channel videos', { error: error instanceof Error ? error.message : String(error) });
      // Return original cached videos on error
      return await this.getCachedVideos();
    }
  }
}

// Export enhanced singleton instance (backward compatible)
export const videoCacheService = enhancedCacheService;

// Keep legacy class available for gradual migration
const legacyVideoCacheService = VideoCacheService.getInstance();