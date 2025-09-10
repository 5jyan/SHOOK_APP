// Enhanced Video Summary Cache Service with Atomic Operations and Validation
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoSummary } from './api';
import { cacheLogger } from '@/utils/logger-enhanced';
import { CacheTransaction } from './cache/CacheTransaction';
import { cacheValidator } from './cache/CacheValidator';
import { cacheRecovery } from './cache/CacheRecovery';

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
  integrity?: {
    checksum: string;
    lastValidated: number;
  };
}

interface CacheStats {
  totalEntries: number;
  cacheSize: number; // in KB
  oldestEntry: number;
  newestEntry: number;
  lastSync: number;
  validationStatus: 'healthy' | 'warning' | 'corrupted';
  lastValidation: number;
}

interface CacheOperationResult {
  success: boolean;
  entriesProcessed: number;
  errors: string[];
  recoveryApplied?: boolean;
}

/**
 * Enhanced Video Cache Service with ACID properties, validation, and recovery
 * 
 * Key improvements:
 * - Atomic transactions for data consistency
 * - Automatic validation and corruption detection
 * - Intelligent recovery mechanisms
 * - Better error handling with fallback strategies
 * - Performance monitoring and optimization
 */
export class EnhancedVideoCacheService {
  private static instance: EnhancedVideoCacheService;
  private readonly CACHE_VERSION = '2.0.0'; // Upgraded version
  private isInitialized = false;
  
  // Cache keys
  private readonly CACHE_KEYS = {
    VIDEO_LIST: 'video_summaries_cache',
    METADATA: 'video_cache_metadata',
    CHANNEL_MAPPING: 'channel_names_cache',
  };

  // Cache configuration
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_ENTRIES = 500; // Maximum number of videos to cache
  private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly AUTO_RECOVERY_ENABLED = true; // RE-ENABLED: crypto issue fixed with expo-crypto

  private constructor() {
    // Initialize recovery on app start
    this.initializeService();
  }

  static getInstance(): EnhancedVideoCacheService {
    if (!EnhancedVideoCacheService.instance) {
      EnhancedVideoCacheService.instance = new EnhancedVideoCacheService();
    }
    return EnhancedVideoCacheService.instance;
  }

  /**
   * Initialize service with recovery and validation
   */
  private async initializeService(): Promise<void> {
    if (this.isInitialized) return;

    try {
      cacheLogger.info('Initializing enhanced cache service');

      // Recover incomplete transactions from previous sessions
      await CacheTransaction.recoverIncompleteTransactions();

      // Perform auto-recovery if needed
      if (this.AUTO_RECOVERY_ENABLED) {
        const recovered = await cacheRecovery.autoRecover();
        if (recovered) {
          cacheLogger.info('Auto-recovery completed successfully');
        }
      }

      // Validate cache periodically
      const shouldValidate = await this.shouldPerformValidation();
      if (shouldValidate) {
        await this.performBackgroundValidation();
      }

      this.isInitialized = true;
      cacheLogger.info('Enhanced cache service initialized');

    } catch (error) {
      cacheLogger.error('Cache service initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Get cache metadata with validation
   */
  private async getCacheMetadata(): Promise<CacheMetadata> {
    cacheLogger.debug('Getting cache metadata');
    
    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (metadataString) {
        const metadata = JSON.parse(metadataString) as CacheMetadata;
        
        // Validate metadata structure
        if (this.isValidMetadata(metadata)) {
          cacheLogger.debug('Valid metadata found', {
            lastSync: new Date(metadata.lastSyncTimestamp).toISOString(),
            totalVideos: metadata.totalVideos,
            version: metadata.cacheVersion,
            userId: metadata.userId,
            hasIntegrity: !!metadata.integrity
          });
          return metadata;
        } else {
          cacheLogger.warn('Invalid metadata structure, using default');
        }
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

  /**
   * Update cache metadata atomically
   */
  private async updateCacheMetadata(
    updates: Partial<CacheMetadata>, 
    transaction?: CacheTransaction
  ): Promise<void> {
    cacheLogger.debug('Updating metadata', updates);
    
    try {
      const currentMetadata = await this.getCacheMetadata();
      const newMetadata: CacheMetadata = {
        ...currentMetadata,
        ...updates,
      };

      // Calculate integrity checksum if data is being updated
      if (updates.totalVideos !== undefined) {
        const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
        if (cachedData) {
          newMetadata.integrity = {
            checksum: cacheValidator.calculateChecksum(cachedData),
            lastValidated: Date.now()
          };
        }
      }

      const metadataString = JSON.stringify(newMetadata);

      if (transaction) {
        await transaction.set(this.CACHE_KEYS.METADATA, metadataString);
      } else {
        await AsyncStorage.setItem(this.CACHE_KEYS.METADATA, metadataString);
      }
      
      cacheLogger.debug('Metadata updated successfully');
    } catch (error) {
      cacheLogger.error('Error updating metadata', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error; // Re-throw to handle in calling code
    }
  }

  /**
   * Get all cached videos with automatic validation
   */
  async getCachedVideos(): Promise<VideoSummary[]> {
    await this.ensureInitialized();
    const startTime = Date.now();
    
    try {
      // Quick health check
      const isHealthy = await cacheValidator.quickHealthCheck();
      if (!isHealthy) {
        cacheLogger.warn('Cache health check failed, attempting recovery');
        const recovered = await cacheRecovery.autoRecover();
        if (!recovered) {
          cacheLogger.error('Auto-recovery failed, returning empty cache');
          return [];
        }
      }

      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      
      if (!cachedData) {
        cacheLogger.debug('No cached data found');
        return [];
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      const currentTime = Date.now();
      
      // Filter out expired and invalid entries
      const validEntries = cacheEntries.filter(entry => {
        // Check expiration
        const age = currentTime - entry.cachedAt;
        const isExpired = age >= this.MAX_CACHE_AGE;
        
        // Check entry validity
        const isValid = this.isValidCacheEntry(entry);
        
        if (isExpired) {
          cacheLogger.debug('Expired entry removed', { 
            videoId: entry.videoId, 
            ageHours: Math.round(age / (1000 * 60 * 60)) 
          });
        }
        
        if (!isValid) {
          cacheLogger.warn('Invalid entry removed', { videoId: entry.videoId });
        }
        
        return !isExpired && isValid;
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
        // Use background update to avoid blocking current request
        this.backgroundUpdateCache(videos);
      }

      return videos;
    } catch (error) {
      cacheLogger.error('Error reading cached videos', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Attempt recovery on read error
      if (this.AUTO_RECOVERY_ENABLED) {
        try {
          const recovered = await cacheRecovery.autoRecover();
          if (recovered) {
            cacheLogger.info('Recovery successful, retrying cache read');
            return await this.getCachedVideos(); // Retry once
          }
        } catch (recoveryError) {
          cacheLogger.error('Recovery failed', {
            error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
          });
        }
      }
      
      return [];
    }
  }

  /**
   * Save videos to cache with atomic transaction
   */
  async saveVideosToCache(videos: VideoSummary[], isRetry: boolean = false): Promise<CacheOperationResult> {
    await this.ensureInitialized();
    cacheLogger.debug('Saving videos to cache', { videoCount: videos.length, isRetry });
    const startTime = Date.now();
    const errors: string[] = [];
    let recoveryApplied = false;
    
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
        cacheLogger.info('Limited cache size', { 
          maxEntries: this.MAX_ENTRIES, 
          originalCount: cacheEntries.length 
        });
      }

      // Use atomic transaction
      const transaction = new CacheTransaction();
      await transaction.begin();

      try {
        // Save video data
        await transaction.set(
          this.CACHE_KEYS.VIDEO_LIST,
          JSON.stringify(limitedEntries)
        );

        // Update metadata
        await this.updateCacheMetadata({
          totalVideos: limitedEntries.length,
          lastSyncTimestamp: currentTime,
        }, transaction);

        await transaction.commit();

        const saveTime = Date.now() - startTime;
        const cacheSize = JSON.stringify(limitedEntries).length / 1024; // KB
        
        cacheLogger.info('Cache saved successfully', { 
          saveTimeMs: saveTime, 
          cacheSizeKB: cacheSize.toFixed(1),
          entriesProcessed: limitedEntries.length
        });

        return {
          success: true,
          entriesProcessed: limitedEntries.length,
          errors,
          recoveryApplied
        };

      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      errors.push(errorMsg);
      cacheLogger.error('Error saving to cache', { 
        error: errorMsg, 
        stack: errorStack,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // Attempt recovery (only once to prevent infinite loop)
      if (this.AUTO_RECOVERY_ENABLED && !isRetry) {
        try {
          recoveryApplied = await cacheRecovery.autoRecover();
          if (recoveryApplied) {
            cacheLogger.info('Recovery applied, retrying save operation');
            return await this.saveVideosToCache(videos, true); // Retry once with flag
          }
        } catch (recoveryError) {
          const recoveryErrorMsg = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
          errors.push(`Recovery failed: ${recoveryErrorMsg}`);
        }
      }

      return {
        success: false,
        entriesProcessed: 0,
        errors,
        recoveryApplied
      };
    }
  }

  /**
   * Merge new videos with cached ones with deduplication
   */
  async mergeVideos(newVideos: VideoSummary[]): Promise<VideoSummary[]> {
    await this.ensureInitialized();
    cacheLogger.debug('Merging new videos with cache', { newVideoCount: newVideos.length });
    const startTime = Date.now();
    
    try {
      const cachedVideos = await this.getCachedVideos();
      
      // Create lookup map for efficient deduplication
      const cachedVideoMap = new Map(cachedVideos.map(v => [v.videoId, v]));
      
      // Filter out videos that are already cached and merge updates
      const actuallyNewVideos: VideoSummary[] = [];
      const updatedVideos: VideoSummary[] = [];
      
      for (const newVideo of newVideos) {
        const existing = cachedVideoMap.get(newVideo.videoId);
        if (!existing) {
          actuallyNewVideos.push(newVideo);
        } else {
          // Check if the new version is more recent
          const newCreated = new Date(newVideo.createdAt).getTime();
          const existingCreated = new Date(existing.createdAt).getTime();
          
          if (newCreated > existingCreated) {
            updatedVideos.push(newVideo);
            cachedVideoMap.set(newVideo.videoId, newVideo); // Update in map
          }
        }
      }
      
      cacheLogger.debug('Video merge analysis', { 
        actuallyNew: actuallyNewVideos.length,
        updated: updatedVideos.length,
        alreadyCached: newVideos.length - actuallyNewVideos.length - updatedVideos.length
      });
      
      // Combine all videos: new + updated + unchanged cached
      const allVideos = [
        ...actuallyNewVideos,
        ...updatedVideos,
        ...Array.from(cachedVideoMap.values()).filter(v => 
          !actuallyNewVideos.some(nv => nv.videoId === v.videoId) &&
          !updatedVideos.some(uv => uv.videoId === v.videoId)
        )
      ];
      
      // Sort by createdAt (when video was processed)
      allVideos.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Save merged data
      const saveResult = await this.saveVideosToCache(allVideos);
      
      if (!saveResult.success) {
        cacheLogger.error('Failed to save merged videos', { errors: saveResult.errors });
        // Return original cached videos on save failure
        return cachedVideos;
      }
      
      const mergeTime = Date.now() - startTime;
      cacheLogger.info('Video merge completed', { 
        mergeTimeMs: mergeTime, 
        totalVideos: allVideos.length,
        newVideos: actuallyNewVideos.length,
        updatedVideos: updatedVideos.length
      });
      
      return allVideos;
      
    } catch (error) {
      cacheLogger.error('Error merging videos', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Fallback to new videos only
      const saveResult = await this.saveVideosToCache(newVideos);
      return saveResult.success ? newVideos : [];
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<number> {
    await this.ensureInitialized();
    const metadata = await this.getCacheMetadata();
    cacheLogger.debug('Retrieved last sync timestamp', { 
      lastSync: new Date(metadata.lastSyncTimestamp).toISOString() 
    });
    return metadata.lastSyncTimestamp;
  }

  /**
   * Clear cache with recovery backup
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    cacheLogger.info('Clearing cache');
    
    try {
      // Create backup before clearing (if cache has data)
      const hasData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      if (hasData) {
        try {
          await cacheRecovery.createBackup();
          cacheLogger.debug('Backup created before cache clear');
        } catch (backupError) {
          cacheLogger.warn('Failed to create backup before clear', {
            error: backupError instanceof Error ? backupError.message : String(backupError)
          });
        }
      }

      // Use atomic transaction for clear
      const transaction = new CacheTransaction();
      await transaction.begin();

      try {
        await transaction.multiRemove([
          this.CACHE_KEYS.VIDEO_LIST,
          this.CACHE_KEYS.METADATA,
          this.CACHE_KEYS.CHANNEL_MAPPING,
        ]);

        await transaction.commit();
        cacheLogger.info('Cache cleared successfully');

      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      cacheLogger.error('Error clearing cache', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Get enhanced cache statistics with validation status
   */
  async getCacheStats(): Promise<CacheStats> {
    await this.ensureInitialized();
    cacheLogger.debug('Getting enhanced cache statistics');
    
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
          validationStatus: 'healthy',
          lastValidation: metadata.integrity?.lastValidated || 0,
        };
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      const cacheSize = cachedData.length / 1024; // KB
      
      const timestamps = cacheEntries
        .map(entry => entry.cachedAt)
        .filter(timestamp => timestamp && timestamp > 0); // Filter out invalid timestamps
      
      const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
      const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

      // Determine validation status
      let validationStatus: 'healthy' | 'warning' | 'corrupted' = 'healthy';
      const isHealthy = await cacheValidator.quickHealthCheck();
      if (!isHealthy) {
        const validation = await cacheValidator.validateCache();
        const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
        validationStatus = criticalIssues.length > 0 ? 'corrupted' : 'warning';
      }

      const stats: CacheStats = {
        totalEntries: cacheEntries.length,
        cacheSize: Math.round(cacheSize * 10) / 10,
        oldestEntry,
        newestEntry,
        lastSync: metadata.lastSyncTimestamp,
        validationStatus,
        lastValidation: metadata.integrity?.lastValidated || 0,
      };

      cacheLogger.debug('Enhanced cache statistics retrieved', {
        totalEntries: stats.totalEntries,
        cacheSizeKB: stats.cacheSize,
        validationStatus: stats.validationStatus,
        oldestEntry: stats.oldestEntry > 0 ? new Date(stats.oldestEntry).toISOString() : 'N/A',
        newestEntry: stats.newestEntry > 0 ? new Date(stats.newestEntry).toISOString() : 'N/A',
        lastSync: stats.lastSync > 0 ? new Date(stats.lastSync).toISOString() : 'N/A',
      });

      return stats;
    } catch (error) {
      cacheLogger.error('Error getting cache stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        totalEntries: 0,
        cacheSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        lastSync: 0,
        validationStatus: 'corrupted',
        lastValidation: 0,
      };
    }
  }

  /**
   * Check if user changed and handle cache invalidation
   */
  async checkUserChanged(currentUserId: number): Promise<boolean> {
    await this.ensureInitialized();
    const metadata = await this.getCacheMetadata();
    
    if (metadata.userId !== currentUserId) {
      cacheLogger.info('User changed, clearing cache', { 
        oldUserId: metadata.userId, 
        newUserId: currentUserId 
      });
      
      await this.clearCache();
      await this.updateCacheMetadata({ userId: currentUserId });
      return true;
    }
    
    return false;
  }

  /**
   * Remove videos from a specific channel atomically
   */
  async removeChannelVideos(channelId: string): Promise<VideoSummary[]> {
    await this.ensureInitialized();
    cacheLogger.debug('Removing videos from channel', { channelId });
    const startTime = Date.now();
    
    try {
      const cachedVideos = await this.getCachedVideos();
      
      // Filter out videos from the specified channel
      const remainingVideos = cachedVideos.filter(video => video.channelId !== channelId);
      const removedCount = cachedVideos.length - remainingVideos.length;
      
      cacheLogger.info('Filtered videos from channel', { channelId, removedCount });
      
      if (removedCount > 0) {
        // Save updated cache using atomic operation
        const saveResult = await this.saveVideosToCache(remainingVideos);
        
        if (!saveResult.success) {
          cacheLogger.error('Failed to save after channel removal', { errors: saveResult.errors });
          return cachedVideos; // Return original on failure
        }
        
        const removeTime = Date.now() - startTime;
        cacheLogger.debug('Channel videos removal completed', { removeTimeMs: removeTime });
      }
      
      return remainingVideos;
    } catch (error) {
      cacheLogger.error('Error removing channel videos', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Return original cached videos on error
      return await this.getCachedVideos();
    }
  }

  /**
   * Perform manual cache validation and recovery
   */
  async validateAndRepair(): Promise<boolean> {
    await this.ensureInitialized();
    cacheLogger.info('Starting manual cache validation and repair');
    
    try {
      const validation = await cacheValidator.validateCache();
      
      if (validation.isValid) {
        cacheLogger.info('Cache validation passed');
        return true;
      }

      // Create recovery plan and execute
      const plan = await cacheRecovery.createRecoveryPlan();
      const result = await cacheRecovery.executeRecovery(plan);
      
      cacheLogger.info('Manual recovery completed', {
        success: result.success,
        strategy: result.strategy,
        recoveredEntries: result.recoveredEntries,
        removedEntries: result.removedEntries
      });
      
      return result.success;
      
    } catch (error) {
      cacheLogger.error('Manual validation and repair failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeService();
    }
  }

  private isValidMetadata(metadata: any): metadata is CacheMetadata {
    return (
      metadata &&
      typeof metadata.lastSyncTimestamp === 'number' &&
      typeof metadata.totalVideos === 'number' &&
      typeof metadata.cacheVersion === 'string' &&
      (metadata.userId === null || typeof metadata.userId === 'number')
    );
  }

  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry.videoId === 'string' &&
      typeof entry.channelId === 'string' &&
      typeof entry.cachedAt === 'number' &&
      entry.data &&
      typeof entry.data === 'object' &&
      typeof entry.data.videoId === 'string'
    );
  }

  private async shouldPerformValidation(): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      if (!metadata.integrity) return true;
      
      const timeSinceValidation = Date.now() - metadata.integrity.lastValidated;
      return timeSinceValidation > this.VALIDATION_INTERVAL;
    } catch {
      return true;
    }
  }

  private async performBackgroundValidation(): Promise<void> {
    try {
      cacheLogger.debug('Performing background validation');
      const isHealthy = await cacheValidator.quickHealthCheck();
      
      if (!isHealthy && this.AUTO_RECOVERY_ENABLED) {
        await cacheRecovery.autoRecover();
      }
      
      // Update validation timestamp
      await this.updateCacheMetadata({
        integrity: {
          checksum: '', // Will be updated by updateCacheMetadata
          lastValidated: Date.now()
        }
      });
      
    } catch (error) {
      cacheLogger.warn('Background validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private backgroundUpdateCache(videos: VideoSummary[]): void {
    // Non-blocking cache update
    setTimeout(() => {
      this.saveVideosToCache(videos).catch(error => {
        cacheLogger.warn('Background cache update failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, 100);
  }
}

// Export singleton instance
export const videoCacheService = EnhancedVideoCacheService.getInstance();