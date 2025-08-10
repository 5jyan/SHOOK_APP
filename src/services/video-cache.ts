// Video Summary Cache Service with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoSummary } from './api';

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
    console.log('📦 [VideoCache] Getting cache metadata...');
    
    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (metadataString) {
        const metadata = JSON.parse(metadataString) as CacheMetadata;
        console.log('📦 [VideoCache] Found metadata:', {
          lastSync: new Date(metadata.lastSyncTimestamp).toISOString(),
          totalVideos: metadata.totalVideos,
          version: metadata.cacheVersion,
          userId: metadata.userId
        });
        return metadata;
      }
    } catch (error) {
      console.error('📦 [VideoCache] Error reading metadata:', error);
    }

    // Return default metadata
    const defaultMetadata: CacheMetadata = {
      lastSyncTimestamp: 0,
      totalVideos: 0,
      cacheVersion: this.CACHE_VERSION,
      userId: null,
    };
    
    console.log('📦 [VideoCache] Using default metadata');
    return defaultMetadata;
  }

  // Update cache metadata
  private async updateCacheMetadata(updates: Partial<CacheMetadata>): Promise<void> {
    console.log('📦 [VideoCache] Updating metadata:', updates);
    
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
      
      console.log('📦 [VideoCache] Metadata updated successfully');
    } catch (error) {
      console.error('📦 [VideoCache] Error updating metadata:', error);
    }
  }

  // Get all cached videos
  async getCachedVideos(): Promise<VideoSummary[]> {
    console.log('📦 [VideoCache] Getting cached videos...');
    const startTime = Date.now();
    
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      
      if (!cachedData) {
        console.log('📦 [VideoCache] No cached data found');
        return [];
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      const currentTime = Date.now();
      
      // Filter out expired entries
      const validEntries = cacheEntries.filter(entry => {
        const age = currentTime - entry.cachedAt;
        const isValid = age < this.MAX_CACHE_AGE;
        
        if (!isValid) {
          console.log(`📦 [VideoCache] Expired entry removed: ${entry.videoId} (age: ${Math.round(age / (1000 * 60 * 60))}h)`);
        }
        
        return isValid;
      });

      // Sort by publishedAt (newest first)
      validEntries.sort((a, b) => 
        new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
      );

      const videos = validEntries.map(entry => entry.data);
      const loadTime = Date.now() - startTime;
      
      console.log(`📦 [VideoCache] Loaded ${videos.length} videos from cache (${loadTime}ms)`);
      console.log(`📦 [VideoCache] Filtered out ${cacheEntries.length - validEntries.length} expired entries`);

      // Update cache if we removed expired entries
      if (cacheEntries.length !== validEntries.length) {
        await this.saveVideosToCache(videos);
      }

      return videos;
    } catch (error) {
      console.error('📦 [VideoCache] Error reading cached videos:', error);
      return [];
    }
  }

  // Save videos to cache
  async saveVideosToCache(videos: VideoSummary[]): Promise<void> {
    console.log(`📦 [VideoCache] Saving ${videos.length} videos to cache...`);
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
        console.log(`📦 [VideoCache] Limited cache to ${this.MAX_ENTRIES} entries (was ${cacheEntries.length})`);
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
      
      console.log(`📦 [VideoCache] Cache saved successfully (${saveTime}ms, ${cacheSize.toFixed(1)}KB)`);
    } catch (error) {
      console.error('📦 [VideoCache] Error saving to cache:', error);
    }
  }

  // Merge new videos with cached ones (incremental update)
  async mergeVideos(newVideos: VideoSummary[]): Promise<VideoSummary[]> {
    console.log(`📦 [VideoCache] Merging ${newVideos.length} new videos with cache...`);
    const startTime = Date.now();
    
    try {
      const cachedVideos = await this.getCachedVideos();
      const cachedVideoIds = new Set(cachedVideos.map(v => v.videoId));
      
      // Filter out videos that are already cached
      const actuallyNewVideos = newVideos.filter(video => !cachedVideoIds.has(video.videoId));
      
      console.log(`📦 [VideoCache] Found ${actuallyNewVideos.length} actually new videos (${newVideos.length - actuallyNewVideos.length} were already cached)`);
      
      // Combine and sort
      const allVideos = [...actuallyNewVideos, ...cachedVideos];
      allVideos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Save merged data
      await this.saveVideosToCache(allVideos);
      
      const mergeTime = Date.now() - startTime;
      console.log(`📦 [VideoCache] Merge completed in ${mergeTime}ms, total: ${allVideos.length} videos`);
      
      return allVideos;
    } catch (error) {
      console.error('📦 [VideoCache] Error merging videos:', error);
      return newVideos; // Fallback to new videos only
    }
  }

  // Get last sync timestamp
  async getLastSyncTimestamp(): Promise<number> {
    const metadata = await this.getCacheMetadata();
    console.log(`📦 [VideoCache] Last sync timestamp: ${new Date(metadata.lastSyncTimestamp).toISOString()}`);
    return metadata.lastSyncTimestamp;
  }

  // Clear cache (for logout or cache reset)
  async clearCache(): Promise<void> {
    console.log('📦 [VideoCache] Clearing cache...');
    
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEYS.VIDEO_LIST,
        this.CACHE_KEYS.METADATA,
        this.CACHE_KEYS.CHANNEL_MAPPING,
      ]);
      
      console.log('📦 [VideoCache] Cache cleared successfully');
    } catch (error) {
      console.error('📦 [VideoCache] Error clearing cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<CacheStats> {
    console.log('📦 [VideoCache] Getting cache statistics...');
    
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

      console.log('📦 [VideoCache] Cache stats:', {
        totalEntries: stats.totalEntries,
        cacheSizeKB: stats.cacheSize,
        oldestEntry: new Date(stats.oldestEntry).toISOString(),
        newestEntry: new Date(stats.newestEntry).toISOString(),
        lastSync: new Date(stats.lastSync).toISOString(),
      });

      return stats;
    } catch (error) {
      console.error('📦 [VideoCache] Error getting stats:', error);
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
      console.log(`📦 [VideoCache] User changed: ${metadata.userId} -> ${currentUserId}, clearing cache`);
      await this.clearCache();
      await this.updateCacheMetadata({ userId: currentUserId });
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const videoCacheService = VideoCacheService.getInstance();