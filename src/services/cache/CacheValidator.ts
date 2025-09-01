// Cache Consistency Validator
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheLogger } from '@/utils/logger-enhanced';
import { VideoSummary } from '../api';

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

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  metrics: ValidationMetrics;
}

interface ValidationIssue {
  type: 'metadata_mismatch' | 'corrupted_data' | 'missing_entry' | 'duplicate_entry' | 'version_mismatch' | 'checksum_mismatch';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: any;
}

interface ValidationMetrics {
  validationTimeMs: number;
  entriesChecked: number;
  corruptedEntries: number;
  duplicateEntries: number;
  metadataAccuracy: number; // 0-1
}

/**
 * Cache Consistency Validator
 * Ensures cache integrity and provides recovery mechanisms
 */
export class CacheValidator {
  private readonly CACHE_KEYS = {
    VIDEO_LIST: 'video_summaries_cache',
    METADATA: 'video_cache_metadata',
    CHANNEL_MAPPING: 'channel_names_cache',
  };

  private readonly CACHE_VERSION = '1.0.0';

  /**
   * Validate complete cache consistency
   */
  async validateCache(): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    let entriesChecked = 0;
    let corruptedEntries = 0;
    let duplicateEntries = 0;

    cacheLogger.info('Starting cache validation');

    try {
      // 1. Validate metadata structure
      const metadataValidation = await this.validateMetadata();
      issues.push(...metadataValidation.issues);

      // 2. Validate video entries
      const entriesValidation = await this.validateVideoEntries();
      issues.push(...entriesValidation.issues);
      entriesChecked = entriesValidation.metrics.entriesChecked;
      corruptedEntries = entriesValidation.metrics.corruptedEntries;
      duplicateEntries = entriesValidation.metrics.duplicateEntries;

      // 3. Validate metadata-data consistency
      const consistencyValidation = await this.validateMetadataConsistency();
      issues.push(...consistencyValidation.issues);

      // 4. Validate data integrity (checksum)
      const integrityValidation = await this.validateDataIntegrity();
      issues.push(...integrityValidation.issues);

      const validationTime = Date.now() - startTime;
      const criticalIssues = issues.filter(issue => issue.severity === 'critical');
      const isValid = criticalIssues.length === 0;

      const result: ValidationResult = {
        isValid,
        issues,
        metrics: {
          validationTimeMs: validationTime,
          entriesChecked,
          corruptedEntries,
          duplicateEntries,
          metadataAccuracy: this.calculateMetadataAccuracy(issues)
        }
      };

      cacheLogger.info('Cache validation completed', {
        isValid,
        validationTimeMs: validationTime,
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        entriesChecked
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      cacheLogger.error('Cache validation failed', {
        error: error instanceof Error ? error.message : String(error),
        validationTimeMs: validationTime
      });

      return {
        isValid: false,
        issues: [{
          type: 'corrupted_data',
          severity: 'critical',
          message: 'Cache validation failed due to system error',
          details: { error: error instanceof Error ? error.message : String(error) }
        }],
        metrics: {
          validationTimeMs: validationTime,
          entriesChecked: 0,
          corruptedEntries: 0,
          duplicateEntries: 0,
          metadataAccuracy: 0
        }
      };
    }
  }

  /**
   * Quick cache health check (lightweight validation)
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      cacheLogger.debug('Performing quick cache health check');

      // Check if essential keys exist
      const keys = await AsyncStorage.getAllKeys();
      const hasVideoCache = keys.includes(this.CACHE_KEYS.VIDEO_LIST);
      const hasMetadata = keys.includes(this.CACHE_KEYS.METADATA);

      if (!hasVideoCache && !hasMetadata) {
        // Empty cache is considered healthy
        cacheLogger.debug('Cache is empty - healthy');
        return true;
      }

      if (hasVideoCache && !hasMetadata) {
        cacheLogger.warn('Video cache exists but metadata is missing');
        return false;
      }

      // Basic metadata validation
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (metadataString) {
        const metadata = JSON.parse(metadataString) as CacheMetadata;
        
        // Check version compatibility
        if (metadata.cacheVersion !== this.CACHE_VERSION) {
          cacheLogger.warn('Cache version mismatch', {
            expected: this.CACHE_VERSION,
            actual: metadata.cacheVersion
          });
          return false;
        }

        // Check reasonable timestamp
        if (metadata.lastSyncTimestamp > Date.now() + 60000) { // Future timestamp with 1min tolerance
          cacheLogger.warn('Invalid future timestamp in metadata');
          return false;
        }
      }

      cacheLogger.debug('Quick health check passed');
      return true;

    } catch (error) {
      cacheLogger.error('Quick health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Validate metadata structure and values
   */
  private async validateMetadata(): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      
      if (!metadataString) {
        issues.push({
          type: 'missing_entry',
          severity: 'warning',
          message: 'Cache metadata is missing'
        });
        return { issues };
      }

      const metadata = JSON.parse(metadataString) as CacheMetadata;

      // Validate required fields
      if (typeof metadata.lastSyncTimestamp !== 'number') {
        issues.push({
          type: 'corrupted_data',
          severity: 'critical',
          message: 'Invalid lastSyncTimestamp in metadata'
        });
      }

      if (typeof metadata.totalVideos !== 'number' || metadata.totalVideos < 0) {
        issues.push({
          type: 'corrupted_data',
          severity: 'critical',
          message: 'Invalid totalVideos in metadata'
        });
      }

      if (metadata.cacheVersion !== this.CACHE_VERSION) {
        issues.push({
          type: 'version_mismatch',
          severity: 'critical',
          message: `Cache version mismatch: expected ${this.CACHE_VERSION}, got ${metadata.cacheVersion}`
        });
      }

      // Validate timestamp reasonableness
      const now = Date.now();
      if (metadata.lastSyncTimestamp > now + 60000) { // Future with tolerance
        issues.push({
          type: 'corrupted_data',
          severity: 'warning',
          message: 'Future timestamp in metadata',
          details: { timestamp: metadata.lastSyncTimestamp, now }
        });
      }

      // Validate very old timestamps (> 30 days)
      if (metadata.lastSyncTimestamp < now - (30 * 24 * 60 * 60 * 1000)) {
        issues.push({
          type: 'corrupted_data',
          severity: 'info',
          message: 'Very old cache timestamp',
          details: { 
            timestamp: metadata.lastSyncTimestamp, 
            ageHours: Math.floor((now - metadata.lastSyncTimestamp) / (1000 * 60 * 60))
          }
        });
      }

    } catch (error) {
      issues.push({
        type: 'corrupted_data',
        severity: 'critical',
        message: 'Failed to parse cache metadata',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    return { issues };
  }

  /**
   * Validate video entries structure and content
   */
  private async validateVideoEntries(): Promise<{ 
    issues: ValidationIssue[], 
    metrics: { entriesChecked: number, corruptedEntries: number, duplicateEntries: number }
  }> {
    const issues: ValidationIssue[] = [];
    let entriesChecked = 0;
    let corruptedEntries = 0;
    let duplicateEntries = 0;

    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
      
      if (!cachedData) {
        return { issues, metrics: { entriesChecked, corruptedEntries, duplicateEntries } };
      }

      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);
      entriesChecked = cacheEntries.length;

      // Track video IDs for duplicate detection
      const seenVideoIds = new Set<string>();
      const seenChannelIds = new Set<string>();

      for (let i = 0; i < cacheEntries.length; i++) {
        const entry = cacheEntries[i];

        try {
          // Validate entry structure
          if (!this.isValidCacheEntry(entry)) {
            issues.push({
              type: 'corrupted_data',
              severity: 'critical',
              message: `Invalid cache entry structure at index ${i}`,
              details: { entryIndex: i, entry }
            });
            corruptedEntries++;
            continue;
          }

          // Check for duplicate video IDs
          if (seenVideoIds.has(entry.videoId)) {
            issues.push({
              type: 'duplicate_entry',
              severity: 'warning',
              message: `Duplicate video ID found: ${entry.videoId}`,
              details: { videoId: entry.videoId, entryIndex: i }
            });
            duplicateEntries++;
          } else {
            seenVideoIds.add(entry.videoId);
          }

          seenChannelIds.add(entry.channelId);

          // Validate video data structure
          if (!this.isValidVideoSummary(entry.data)) {
            issues.push({
              type: 'corrupted_data',
              severity: 'critical',
              message: `Invalid video data structure at index ${i}`,
              details: { entryIndex: i, videoId: entry.videoId }
            });
            corruptedEntries++;
          }

          // Validate timestamps
          if (entry.cachedAt > Date.now() + 60000) { // Future timestamp
            issues.push({
              type: 'corrupted_data',
              severity: 'warning',
              message: `Future cache timestamp for video ${entry.videoId}`,
              details: { videoId: entry.videoId, cachedAt: entry.cachedAt }
            });
          }

        } catch (entryError) {
          issues.push({
            type: 'corrupted_data',
            severity: 'critical',
            message: `Failed to validate entry at index ${i}`,
            details: { 
              entryIndex: i, 
              error: entryError instanceof Error ? entryError.message : String(entryError) 
            }
          });
          corruptedEntries++;
        }
      }

      cacheLogger.debug('Video entries validation completed', {
        entriesChecked,
        corruptedEntries,
        duplicateEntries,
        uniqueChannels: seenChannelIds.size
      });

    } catch (error) {
      issues.push({
        type: 'corrupted_data',
        severity: 'critical',
        message: 'Failed to parse cached video entries',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    return { issues, metrics: { entriesChecked, corruptedEntries, duplicateEntries } };
  }

  /**
   * Validate consistency between metadata and actual data
   */
  private async validateMetadataConsistency(): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);

      if (!metadataString || !cachedData) {
        // Can't validate consistency if either is missing
        return { issues };
      }

      const metadata = JSON.parse(metadataString) as CacheMetadata;
      const cacheEntries: CacheEntry[] = JSON.parse(cachedData);

      // Check video count consistency
      if (metadata.totalVideos !== cacheEntries.length) {
        issues.push({
          type: 'metadata_mismatch',
          severity: 'critical',
          message: 'Video count mismatch between metadata and actual entries',
          details: { 
            metadataCount: metadata.totalVideos, 
            actualCount: cacheEntries.length 
          }
        });
      }

      // Check if cache is empty but metadata suggests otherwise
      if (cacheEntries.length === 0 && metadata.lastSyncTimestamp > 0) {
        issues.push({
          type: 'metadata_mismatch',
          severity: 'warning',
          message: 'Cache is empty but metadata suggests it was synced',
          details: { lastSyncTimestamp: metadata.lastSyncTimestamp }
        });
      }

    } catch (error) {
      issues.push({
        type: 'corrupted_data',
        severity: 'critical',
        message: 'Failed to validate metadata consistency',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    return { issues };
  }

  /**
   * Validate data integrity using checksum
   */
  private async validateDataIntegrity(): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    try {
      const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);

      if (!metadataString || !cachedData) {
        return { issues };
      }

      const metadata = JSON.parse(metadataString) as CacheMetadata;

      if (metadata.integrity) {
        const currentChecksum = this.calculateChecksum(cachedData);
        
        if (currentChecksum !== metadata.integrity.checksum) {
          issues.push({
            type: 'checksum_mismatch',
            severity: 'critical',
            message: 'Cache data integrity checksum mismatch',
            details: { 
              expectedChecksum: metadata.integrity.checksum,
              actualChecksum: currentChecksum
            }
          });
        }
      } else {
        issues.push({
          type: 'missing_entry',
          severity: 'info',
          message: 'Cache integrity checksum is missing',
        });
      }

    } catch (error) {
      issues.push({
        type: 'corrupted_data',
        severity: 'critical',
        message: 'Failed to validate data integrity',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    return { issues };
  }

  /**
   * Calculate simple checksum for data integrity
   */
  calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if cache entry has valid structure
   */
  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry.videoId === 'string' &&
      typeof entry.channelId === 'string' &&
      typeof entry.cachedAt === 'number' &&
      entry.data &&
      typeof entry.data === 'object'
    );
  }

  /**
   * Check if video summary has valid structure
   */
  private isValidVideoSummary(data: any): data is VideoSummary {
    return (
      data &&
      typeof data.videoId === 'string' &&
      typeof data.channelId === 'string' &&
      typeof data.title === 'string' &&
      typeof data.publishedAt === 'string' &&
      typeof data.createdAt === 'string' &&
      typeof data.processed === 'boolean'
    );
  }

  /**
   * Calculate metadata accuracy score based on validation issues
   */
  private calculateMetadataAccuracy(issues: ValidationIssue[]): number {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    const warningIssues = issues.filter(issue => issue.severity === 'warning').length;
    
    // Simple scoring: critical issues have more weight
    const totalScore = (criticalIssues * 3) + (warningIssues * 1);
    const maxScore = 10; // Arbitrary baseline
    
    return Math.max(0, Math.min(1, (maxScore - totalScore) / maxScore));
  }
}

export const cacheValidator = new CacheValidator();