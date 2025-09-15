// Permanent Channel Cache Service with 3-day sync interval
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserChannel } from './api';
import { cacheLogger } from '@/utils/logger-enhanced';

interface ChannelCacheEntry {
  channelId: string;
  data: UserChannel;
  cachedAt: number;
  userId: number;
}

interface ChannelCacheMetadata {
  lastSyncTimestamp: number;
  totalChannels: number;
  userId: number | null;
  cacheVersion: string;
}

interface ChannelCacheStats {
  totalEntries: number;
  cacheSize: number; // in KB
  lastSync: number;
  daysSinceSync: number;
  shouldSync: boolean;
}

/**
 * Permanent Channel Cache Service
 *
 * Features:
 * - Permanent storage (no automatic deletion)
 * - 3-day sync interval for optimal balance
 * - User-specific cache isolation
 * - Graceful error handling with fallbacks
 */
export class ChannelCacheService {
  private static instance: ChannelCacheService;
  private readonly CACHE_VERSION = '1.0.0';

  // Cache keys
  private readonly CACHE_KEYS = {
    CHANNEL_LIST: 'user_channels_cache_permanent',
    METADATA: 'channel_cache_metadata_permanent',
  };

  // Cache configuration
  private readonly SYNC_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
  private readonly MAX_CACHE_AGE = Number.MAX_SAFE_INTEGER; // Permanent storage
  private readonly MAX_CHANNELS = 1000; // Realistic upper limit

  private constructor() {}

  static getInstance(): ChannelCacheService {
    if (!ChannelCacheService.instance) {
      ChannelCacheService.instance = new ChannelCacheService();
    }
    return ChannelCacheService.instance;
  }

  /**
   * Check if cache needs synchronization (3+ days old)
   */
  async shouldSync(): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTimestamp();

      if (lastSync === 0) {
        cacheLogger.info('No cache found, sync required');
        return true;
      }

      const daysSinceSync = (Date.now() - lastSync) / (24 * 60 * 60 * 1000);
      const shouldSyncNow = daysSinceSync >= 3;

      cacheLogger.info('Cache age check', {
        lastSync: new Date(lastSync).toISOString(),
        daysSinceSync: daysSinceSync.toFixed(1),
        shouldSync: shouldSyncNow
      });

      return shouldSyncNow;
    } catch (error) {
      cacheLogger.error('Error checking sync status', { error: error instanceof Error ? error.message : String(error) });
      return true; // Default to sync on error
    }
  }

  /**
   * Get cached channels for current user
   */
  async getCachedChannels(): Promise<UserChannel[]> {
    try {
      const rawData = await AsyncStorage.getItem(this.CACHE_KEYS.CHANNEL_LIST);

      if (!rawData) {
        cacheLogger.info('No cached channels found');
        return [];
      }

      const cacheEntries: ChannelCacheEntry[] = JSON.parse(rawData);
      const channels = cacheEntries.map(entry => entry.data);

      cacheLogger.info('Loaded cached channels', { channelCount: channels.length });

      return channels;
    } catch (error) {
      cacheLogger.error('Error loading cached channels', { error: error instanceof Error ? error.message : String(error) });
      return []; // Return empty array on error
    }
  }

  /**
   * Save channels to permanent cache
   */
  async saveChannelsToCache(channels: UserChannel[]): Promise<void> {
    try {
      const currentTime = Date.now();
      const metadata = await this.getCacheMetadata();

      // Create cache entries
      const cacheEntries: ChannelCacheEntry[] = channels.map(channel => ({
        channelId: channel.channelId,
        data: channel,
        cachedAt: currentTime,
        userId: channel.userId,
      }));

      // Save channel data
      await AsyncStorage.setItem(
        this.CACHE_KEYS.CHANNEL_LIST,
        JSON.stringify(cacheEntries)
      );

      // Update metadata
      const updatedMetadata: ChannelCacheMetadata = {
        ...metadata,
        lastSyncTimestamp: currentTime,
        totalChannels: channels.length,
        userId: channels.length > 0 ? channels[0].userId : metadata.userId,
        cacheVersion: this.CACHE_VERSION,
      };

      await AsyncStorage.setItem(
        this.CACHE_KEYS.METADATA,
        JSON.stringify(updatedMetadata)
      );

      cacheLogger.info('Channels saved to permanent cache', {
        channelCount: channels.length,
        cacheSize: this.calculateCacheSize(cacheEntries),
        userId: updatedMetadata.userId
      });

    } catch (error) {
      cacheLogger.error('Error saving channels to cache', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<number> {
    try {
      const metadata = await this.getCacheMetadata();
      return metadata.lastSyncTimestamp;
    } catch (error) {
      cacheLogger.error('Error getting last sync timestamp', { error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(): Promise<ChannelCacheMetadata> {
    try {
      const rawMetadata = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);

      if (!rawMetadata) {
        return {
          lastSyncTimestamp: 0,
          totalChannels: 0,
          userId: null,
          cacheVersion: this.CACHE_VERSION,
        };
      }

      return JSON.parse(rawMetadata);
    } catch (error) {
      cacheLogger.error('Error loading cache metadata', { error: error instanceof Error ? error.message : String(error) });
      return {
        lastSyncTimestamp: 0,
        totalChannels: 0,
        userId: null,
        cacheVersion: this.CACHE_VERSION,
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<ChannelCacheStats> {
    try {
      const metadata = await this.getCacheMetadata();
      const channels = await this.getCachedChannels();
      const lastSync = metadata.lastSyncTimestamp;
      const daysSinceSync = lastSync > 0 ? (Date.now() - lastSync) / (24 * 60 * 60 * 1000) : 0;

      const rawData = await AsyncStorage.getItem(this.CACHE_KEYS.CHANNEL_LIST);
      const cacheSize = rawData ? this.calculateCacheSize(JSON.parse(rawData)) : 0;

      return {
        totalEntries: channels.length,
        cacheSize,
        lastSync,
        daysSinceSync: Math.round(daysSinceSync * 10) / 10, // Round to 1 decimal
        shouldSync: daysSinceSync >= 3,
      };
    } catch (error) {
      cacheLogger.error('Error getting cache stats', { error: error instanceof Error ? error.message : String(error) });
      return {
        totalEntries: 0,
        cacheSize: 0,
        lastSync: 0,
        daysSinceSync: 0,
        shouldSync: true,
      };
    }
  }

  /**
   * Check if user changed and clear cache if needed
   */
  async checkUserChanged(currentUserId: number): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();

      if (metadata.userId !== null && metadata.userId !== currentUserId) {
        cacheLogger.info('User changed, clearing cache', {
          previousUserId: metadata.userId,
          currentUserId
        });

        await this.clearCache();
        return true; // Cache was cleared
      }

      return false; // No change
    } catch (error) {
      cacheLogger.error('Error checking user change', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Clear all cache data (only when user changes)
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEYS.CHANNEL_LIST,
        this.CACHE_KEYS.METADATA,
      ]);

      cacheLogger.info('Channel cache cleared completely');
    } catch (error) {
      cacheLogger.error('Error clearing cache', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Force next access to sync (for manual refresh)
   */
  async forceSync(): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      const updatedMetadata = {
        ...metadata,
        lastSyncTimestamp: 0, // Force sync by setting to 0
      };

      await AsyncStorage.setItem(
        this.CACHE_KEYS.METADATA,
        JSON.stringify(updatedMetadata)
      );

      cacheLogger.info('Forced sync - cache marked as stale');
    } catch (error) {
      cacheLogger.error('Error forcing sync', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Compare cached channels with server data
   */
  async compareChannels(cachedChannels: UserChannel[], serverChannels: UserChannel[]): Promise<boolean> {
    try {
      // Quick check: different count
      if (cachedChannels.length !== serverChannels.length) {
        cacheLogger.info('Channel count changed', {
          cached: cachedChannels.length,
          server: serverChannels.length
        });
        return true; // Different
      }

      // Deep check: thumbnail URLs and other important fields
      for (const serverChannel of serverChannels) {
        const cachedChannel = cachedChannels.find(c => c.channelId === serverChannel.channelId);

        if (!cachedChannel) {
          cacheLogger.info('New channel found', { channelId: serverChannel.channelId });
          return true; // New channel
        }

        // Check if important fields changed
        if (cachedChannel.youtubeChannel.thumbnail !== serverChannel.youtubeChannel.thumbnail ||
            cachedChannel.youtubeChannel.title !== serverChannel.youtubeChannel.title) {
          cacheLogger.info('Channel data changed', {
            channelId: serverChannel.channelId,
            field: 'thumbnail or title'
          });
          return true; // Changed
        }
      }

      cacheLogger.info('No significant changes detected');
      return false; // No changes
    } catch (error) {
      cacheLogger.error('Error comparing channels', { error: error instanceof Error ? error.message : String(error) });
      return true; // Default to different on error
    }
  }

  /**
   * Calculate cache size in KB
   */
  private calculateCacheSize(cacheEntries: ChannelCacheEntry[]): number {
    try {
      const jsonString = JSON.stringify(cacheEntries);
      return Math.round((jsonString.length * 2) / 1024 * 100) / 100; // Convert to KB, round to 2 decimals
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const channelCacheService = ChannelCacheService.getInstance();