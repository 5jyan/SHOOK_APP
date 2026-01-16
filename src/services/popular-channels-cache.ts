import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheLogger } from '@/utils/logger-enhanced';
import { type PopularChannel } from '@/services/api';

const CACHE_KEY = 'popular_channels_cache_v1';

type PopularChannelsCachePayload = {
  cachedAt: number;
  channels: PopularChannel[];
};

export const popularChannelsCacheService = {
  async getCachedPopularChannels(): Promise<PopularChannel[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as PopularChannelsCachePayload;
      if (!parsed?.channels || !Array.isArray(parsed.channels)) {
        return [];
      }
      return parsed.channels;
    } catch (error) {
      cacheLogger.error('Failed to load popular channels cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  },

  async savePopularChannels(channels: PopularChannel[]): Promise<void> {
    try {
      const payload: PopularChannelsCachePayload = {
        cachedAt: Date.now(),
        channels,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      cacheLogger.error('Failed to save popular channels cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      cacheLogger.error('Failed to clear popular channels cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
