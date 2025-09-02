// Cache Recovery System
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheLogger } from '@/utils/logger-enhanced';
import { CacheValidator, cacheValidator } from './CacheValidator';
import { CacheTransaction } from './CacheTransaction';
import { VideoSummary } from '../api';

interface RecoveryPlan {
  strategy: RecoveryStrategy;
  actions: RecoveryAction[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  dataLossRisk: boolean;
}

interface RecoveryAction {
  type: 'repair_metadata' | 'remove_duplicates' | 'rebuild_cache' | 'clear_corrupted' | 'update_checksums' | 'merge_data';
  description: string;
  priority: number;
  reversible: boolean;
}

type RecoveryStrategy = 'repair' | 'rebuild' | 'partial_clear' | 'full_clear';

interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  actionsExecuted: RecoveryAction[];
  recoveredEntries: number;
  removedEntries: number;
  timeMs: number;
  errors: string[];
}

interface CacheBackup {
  timestamp: number;
  videoData: string;
  metadata: string;
  channelMapping?: string;
  checksum: string;
}

/**
 * Intelligent Cache Recovery System
 * Provides automated recovery strategies for corrupted cache data
 */
export class CacheRecovery {
  private readonly CACHE_KEYS = {
    VIDEO_LIST: 'video_summaries_cache',
    METADATA: 'video_cache_metadata',
    CHANNEL_MAPPING: 'channel_names_cache',
    BACKUP_PREFIX: 'cache_backup_',
  };

  private readonly CACHE_VERSION = '2.0.0';
  private readonly MAX_BACKUPS = 3;

  /**
   * Analyze cache problems and create recovery plan
   */
  async createRecoveryPlan(): Promise<RecoveryPlan> {
    cacheLogger.info('Creating cache recovery plan');
    
    const validation = await cacheValidator.validateCache();
    const actions: RecoveryAction[] = [];
    let strategy: RecoveryStrategy = 'repair';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let dataLossRisk = false;

    // Analyze validation issues to determine recovery strategy
    const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
    const warningIssues = validation.issues.filter(issue => issue.severity === 'warning');

    cacheLogger.debug('Analyzing validation results', {
      totalIssues: validation.issues.length,
      criticalIssues: criticalIssues.length,
      warningIssues: warningIssues.length,
      isValid: validation.isValid
    });

    // Determine strategy based on issue severity
    if (criticalIssues.length === 0) {
      // Only minor issues - simple repair
      strategy = 'repair';
      riskLevel = 'low';
    } else if (criticalIssues.length <= 2 && validation.metrics.corruptedEntries < validation.metrics.entriesChecked * 0.1) {
      // Few critical issues and < 10% corruption - targeted repair
      strategy = 'repair';
      riskLevel = 'medium';
    } else if (validation.metrics.corruptedEntries > validation.metrics.entriesChecked * 0.5) {
      // > 50% corruption - rebuild required
      strategy = 'rebuild';
      riskLevel = 'high';
      dataLossRisk = true;
    } else {
      // Moderate corruption - partial clear
      strategy = 'partial_clear';
      riskLevel = 'medium';
      dataLossRisk = true;
    }

    // Create specific actions based on issues found
    for (const issue of validation.issues) {
      switch (issue.type) {
        case 'metadata_mismatch':
          actions.push({
            type: 'repair_metadata',
            description: 'Recalculate and update metadata to match actual cache content',
            priority: 1,
            reversible: false
          });
          break;

        case 'duplicate_entry':
          actions.push({
            type: 'remove_duplicates',
            description: 'Remove duplicate video entries keeping the most recent',
            priority: 2,
            reversible: false
          });
          break;

        case 'corrupted_data':
          if (issue.severity === 'critical') {
            actions.push({
              type: 'clear_corrupted',
              description: 'Remove corrupted cache entries',
              priority: 1,
              reversible: false
            });
          }
          break;

        case 'version_mismatch':
          actions.push({
            type: 'rebuild_cache',
            description: 'Rebuild cache with current version format',
            priority: 3,
            reversible: false
          });
          break;

        case 'checksum_mismatch':
          actions.push({
            type: 'update_checksums',
            description: 'Recalculate and update integrity checksums',
            priority: 4,
            reversible: true
          });
          break;
      }
    }

    // Sort actions by priority
    actions.sort((a, b) => a.priority - b.priority);

    // Estimate recovery time
    const estimatedTime = this.estimateRecoveryTime(strategy, actions.length, validation.metrics.entriesChecked);

    const plan: RecoveryPlan = {
      strategy,
      actions,
      estimatedTime,
      riskLevel,
      dataLossRisk
    };

    cacheLogger.info('Recovery plan created', {
      strategy,
      actionCount: actions.length,
      estimatedTimeMs: estimatedTime,
      riskLevel,
      dataLossRisk
    });

    return plan;
  }

  /**
   * Execute recovery plan with backup
   */
  async executeRecovery(plan: RecoveryPlan): Promise<RecoveryResult> {
    const startTime = Date.now();
    const executedActions: RecoveryAction[] = [];
    const errors: string[] = [];
    let recoveredEntries = 0;
    let removedEntries = 0;

    cacheLogger.info('Executing cache recovery', {
      strategy: plan.strategy,
      actionCount: plan.actions.length,
      riskLevel: plan.riskLevel
    });

    try {
      // Create backup before recovery
      if (plan.riskLevel !== 'low') {
        await this.createBackup();
      }

      // Create transaction for atomic recovery
      const transaction = new CacheTransaction();
      await transaction.begin();

      try {
        // Execute recovery actions
        for (const action of plan.actions) {
          try {
            const actionResult = await this.executeRecoveryAction(action, transaction);
            executedActions.push(action);
            recoveredEntries += actionResult.recovered;
            removedEntries += actionResult.removed;

            cacheLogger.debug('Recovery action completed', {
              actionType: action.type,
              recovered: actionResult.recovered,
              removed: actionResult.removed
            });

          } catch (actionError) {
            const errorMsg = `Action ${action.type} failed: ${actionError instanceof Error ? actionError.message : String(actionError)}`;
            errors.push(errorMsg);
            cacheLogger.error('Recovery action failed', {
              actionType: action.type,
              error: actionError instanceof Error ? actionError.message : String(actionError)
            });

            // If critical action fails, abort recovery
            if (action.priority <= 2) {
              throw new Error(`Critical recovery action failed: ${action.type}`);
            }
          }
        }

        // Commit all changes
        await transaction.commit();

        const recoveryTime = Date.now() - startTime;
        
        cacheLogger.info('Cache recovery completed successfully', {
          strategy: plan.strategy,
          actionsExecuted: executedActions.length,
          recoveredEntries,
          removedEntries,
          recoveryTimeMs: recoveryTime,
          errors: errors.length
        });

        return {
          success: true,
          strategy: plan.strategy,
          actionsExecuted: executedActions,
          recoveredEntries,
          removedEntries,
          timeMs: recoveryTime,
          errors
        };

      } catch (transactionError) {
        // Rollback on failure
        await transaction.rollback();
        throw transactionError;
      }

    } catch (error) {
      const recoveryTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);

      cacheLogger.error('Cache recovery failed', {
        strategy: plan.strategy,
        error: errorMsg,
        recoveryTimeMs: recoveryTime
      });

      return {
        success: false,
        strategy: plan.strategy,
        actionsExecuted: executedActions,
        recoveredEntries,
        removedEntries,
        timeMs: recoveryTime,
        errors
      };
    }
  }

  /**
   * Auto-recover cache issues (called on app start)
   */
  async autoRecover(): Promise<boolean> {
    cacheLogger.info('Starting automatic cache recovery');

    try {
      // Quick health check first
      const isHealthy = await cacheValidator.quickHealthCheck();
      if (isHealthy) {
        cacheLogger.debug('Cache is healthy, no recovery needed');
        return true;
      }

      cacheLogger.info('Cache health check failed, attempting recovery');

      // Create recovery plan
      const plan = await this.createRecoveryPlan();

      // Only auto-recover low-risk issues, but also allow medium-risk without data loss
      if ((plan.riskLevel === 'low') || (plan.riskLevel === 'medium' && !plan.dataLossRisk)) {
        cacheLogger.info('Executing auto-recovery plan', {
          strategy: plan.strategy,
          riskLevel: plan.riskLevel,
          actionCount: plan.actions.length
        });

        const result = await this.executeRecovery(plan);
        
        if (result.success) {
          cacheLogger.info('Automatic recovery successful', {
            strategy: result.strategy,
            recoveredEntries: result.recoveredEntries,
            removedEntries: result.removedEntries
          });
          return true;
        } else {
          cacheLogger.warn('Automatic recovery failed, clearing cache as fallback', {
            errors: result.errors
          });
          
          // Fallback: clear cache if recovery fails
          try {
            await this.clearCacheAsFallback();
            cacheLogger.info('Cache cleared as fallback recovery');
            return true;
          } catch (clearError) {
            cacheLogger.error('Fallback cache clear failed', {
              error: clearError instanceof Error ? clearError.message : String(clearError)
            });
            return false;
          }
        }
      } else {
        cacheLogger.warn('Cache issues require manual recovery due to risk level', {
          riskLevel: plan.riskLevel,
          dataLossRisk: plan.dataLossRisk,
          actionCount: plan.actions.length
        });
        
        // For high-risk scenarios, try clearing cache as last resort
        if (plan.riskLevel === 'high') {
          try {
            await this.clearCacheAsFallback();
            cacheLogger.info('High-risk cache cleared as recovery fallback');
            return true;
          } catch (clearError) {
            cacheLogger.error('High-risk cache clear failed', {
              error: clearError instanceof Error ? clearError.message : String(clearError)
            });
          }
        }
        
        return false;
      }

    } catch (error) {
      cacheLogger.error('Automatic recovery failed with exception', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Last resort: try to clear cache
      try {
        await this.clearCacheAsFallback();
        cacheLogger.info('Exception recovery: cache cleared');
        return true;
      } catch (clearError) {
        cacheLogger.error('Exception recovery: cache clear failed', {
          error: clearError instanceof Error ? clearError.message : String(clearError)
        });
        return false;
      }
    }
  }

  /**
   * Create cache backup
   */
  async createBackup(): Promise<void> {
    cacheLogger.info('Creating cache backup');

    try {
      const timestamp = Date.now();
      const backupKey = `${this.CACHE_KEYS.BACKUP_PREFIX}${timestamp}`;

      // Get current cache data
      const videoData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST) || '';
      const metadata = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA) || '';
      const channelMapping = await AsyncStorage.getItem(this.CACHE_KEYS.CHANNEL_MAPPING) || '';

      // Calculate checksum for backup integrity
      const allData = videoData + metadata + channelMapping;
      const checksum = cacheValidator.calculateChecksum(allData);

      const backup: CacheBackup = {
        timestamp,
        videoData,
        metadata,
        channelMapping,
        checksum
      };

      await AsyncStorage.setItem(backupKey, JSON.stringify(backup));

      // Clean up old backups
      await this.cleanupOldBackups();

      cacheLogger.info('Cache backup created', { backupKey, checksum });

    } catch (error) {
      cacheLogger.error('Failed to create cache backup', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Restore cache from backup
   */
  async restoreFromBackup(backupTimestamp?: number): Promise<boolean> {
    cacheLogger.info('Restoring cache from backup', { backupTimestamp });

    try {
      // Find backup to restore
      let backupKey: string;
      if (backupTimestamp) {
        backupKey = `${this.CACHE_KEYS.BACKUP_PREFIX}${backupTimestamp}`;
      } else {
        // Find most recent backup
        const allKeys = await AsyncStorage.getAllKeys();
        const backupKeys = allKeys
          .filter(key => key.startsWith(this.CACHE_KEYS.BACKUP_PREFIX))
          .sort((a, b) => {
            const timestampA = parseInt(a.replace(this.CACHE_KEYS.BACKUP_PREFIX, ''));
            const timestampB = parseInt(b.replace(this.CACHE_KEYS.BACKUP_PREFIX, ''));
            return timestampB - timestampA;
          });

        if (backupKeys.length === 0) {
          cacheLogger.error('No cache backups found');
          return false;
        }

        backupKey = backupKeys[0];
      }

      // Load and validate backup
      const backupString = await AsyncStorage.getItem(backupKey);
      if (!backupString) {
        cacheLogger.error('Backup not found', { backupKey });
        return false;
      }

      const backup: CacheBackup = JSON.parse(backupString);

      // Verify backup integrity
      const allData = backup.videoData + backup.metadata + (backup.channelMapping || '');
      const calculatedChecksum = cacheValidator.calculateChecksum(allData);
      
      if (calculatedChecksum !== backup.checksum) {
        cacheLogger.error('Backup integrity check failed', {
          backupKey,
          expectedChecksum: backup.checksum,
          actualChecksum: calculatedChecksum
        });
        return false;
      }

      // Restore cache using transaction
      const transaction = new CacheTransaction();
      await transaction.begin();

      try {
        // Restore cache data
        if (backup.videoData) {
          await transaction.set(this.CACHE_KEYS.VIDEO_LIST, backup.videoData);
        } else {
          await transaction.remove(this.CACHE_KEYS.VIDEO_LIST);
        }

        if (backup.metadata) {
          await transaction.set(this.CACHE_KEYS.METADATA, backup.metadata);
        } else {
          await transaction.remove(this.CACHE_KEYS.METADATA);
        }

        if (backup.channelMapping) {
          await transaction.set(this.CACHE_KEYS.CHANNEL_MAPPING, backup.channelMapping);
        } else {
          await transaction.remove(this.CACHE_KEYS.CHANNEL_MAPPING);
        }

        await transaction.commit();

        cacheLogger.info('Cache restored from backup successfully', {
          backupKey,
          backupTimestamp: backup.timestamp
        });

        return true;

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      cacheLogger.error('Failed to restore cache from backup', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Execute individual recovery action
   */
  private async executeRecoveryAction(
    action: RecoveryAction, 
    transaction: CacheTransaction
  ): Promise<{ recovered: number, removed: number }> {
    let recovered = 0;
    let removed = 0;

    switch (action.type) {
      case 'repair_metadata':
        const repairResult = await this.repairMetadata(transaction);
        recovered = repairResult.recovered;
        break;

      case 'remove_duplicates':
        const dedupeResult = await this.removeDuplicates(transaction);
        removed = dedupeResult.removed;
        break;

      case 'clear_corrupted':
        const clearResult = await this.clearCorruptedEntries(transaction);
        removed = clearResult.removed;
        break;

      case 'rebuild_cache':
        const rebuildResult = await this.rebuildCache(transaction);
        recovered = rebuildResult.recovered;
        break;

      case 'update_checksums':
        await this.updateChecksums(transaction);
        break;

      default:
        throw new Error(`Unknown recovery action: ${action.type}`);
    }

    return { recovered, removed };
  }

  private async repairMetadata(transaction: CacheTransaction): Promise<{ recovered: number }> {
    const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
    if (!cachedData) return { recovered: 0 };

    const entries = JSON.parse(cachedData);
    const now = Date.now();

    const newMetadata = {
      lastSyncTimestamp: now,
      totalVideos: entries.length,
      cacheVersion: this.CACHE_VERSION,
      userId: null, // Will be set when user logs in
      integrity: {
        checksum: cacheValidator.calculateChecksum(cachedData),
        lastValidated: now
      }
    };

    await transaction.set(this.CACHE_KEYS.METADATA, JSON.stringify(newMetadata));
    return { recovered: 1 };
  }

  private async removeDuplicates(transaction: CacheTransaction): Promise<{ removed: number }> {
    const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
    if (!cachedData) return { removed: 0 };

    const entries = JSON.parse(cachedData);
    const seenVideoIds = new Set<string>();
    const uniqueEntries = [];
    let removedCount = 0;

    for (const entry of entries) {
      if (!seenVideoIds.has(entry.videoId)) {
        seenVideoIds.add(entry.videoId);
        uniqueEntries.push(entry);
      } else {
        removedCount++;
      }
    }

    await transaction.set(this.CACHE_KEYS.VIDEO_LIST, JSON.stringify(uniqueEntries));
    return { removed: removedCount };
  }

  private async clearCorruptedEntries(transaction: CacheTransaction): Promise<{ removed: number }> {
    const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
    if (!cachedData) return { removed: 0 };

    const entries = JSON.parse(cachedData);
    const validEntries = [];
    let removedCount = 0;

    for (const entry of entries) {
      if (this.isValidEntry(entry)) {
        validEntries.push(entry);
      } else {
        removedCount++;
      }
    }

    await transaction.set(this.CACHE_KEYS.VIDEO_LIST, JSON.stringify(validEntries));
    return { removed: removedCount };
  }

  private async rebuildCache(transaction: CacheTransaction): Promise<{ recovered: number }> {
    // Clear all cache data and rebuild from scratch
    await transaction.remove(this.CACHE_KEYS.VIDEO_LIST);
    await transaction.remove(this.CACHE_KEYS.METADATA);
    await transaction.remove(this.CACHE_KEYS.CHANNEL_MAPPING);

    // Initialize empty cache
    const emptyMetadata = {
      lastSyncTimestamp: 0,
      totalVideos: 0,
      cacheVersion: this.CACHE_VERSION,
      userId: null
    };

    await transaction.set(this.CACHE_KEYS.METADATA, JSON.stringify(emptyMetadata));
    return { recovered: 0 };
  }

  private async updateChecksums(transaction: CacheTransaction): Promise<void> {
    const cachedData = await AsyncStorage.getItem(this.CACHE_KEYS.VIDEO_LIST);
    const metadataString = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
    
    if (!cachedData || !metadataString) return;

    const metadata = JSON.parse(metadataString);
    const checksum = cacheValidator.calculateChecksum(cachedData);
    
    metadata.integrity = {
      checksum,
      lastValidated: Date.now()
    };

    await transaction.set(this.CACHE_KEYS.METADATA, JSON.stringify(metadata));
  }

  private isValidEntry(entry: any): boolean {
    return (
      entry &&
      typeof entry.videoId === 'string' &&
      typeof entry.channelId === 'string' &&
      typeof entry.cachedAt === 'number' &&
      entry.data &&
      typeof entry.data.videoId === 'string'
    );
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys
        .filter(key => key.startsWith(this.CACHE_KEYS.BACKUP_PREFIX))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace(this.CACHE_KEYS.BACKUP_PREFIX, ''));
          const timestampB = parseInt(b.replace(this.CACHE_KEYS.BACKUP_PREFIX, ''));
          return timestampB - timestampA;
        });

      if (backupKeys.length > this.MAX_BACKUPS) {
        const keysToRemove = backupKeys.slice(this.MAX_BACKUPS);
        await AsyncStorage.multiRemove(keysToRemove);
        
        cacheLogger.debug('Old backups cleaned up', {
          removedCount: keysToRemove.length,
          remainingCount: this.MAX_BACKUPS
        });
      }
    } catch (error) {
      cacheLogger.warn('Failed to cleanup old backups', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear cache as fallback recovery mechanism
   */
  private async clearCacheAsFallback(): Promise<void> {
    cacheLogger.info('Clearing cache as fallback recovery');
    
    try {
      // Use AsyncStorage.multiRemove for atomic operation
      const keysToRemove = [
        this.CACHE_KEYS.VIDEO_LIST,
        this.CACHE_KEYS.METADATA,
        this.CACHE_KEYS.CHANNEL_MAPPING
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      cacheLogger.info('Cache cleared successfully as fallback');
    } catch (error) {
      cacheLogger.error('Failed to clear cache as fallback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private estimateRecoveryTime(
    strategy: RecoveryStrategy, 
    actionCount: number, 
    entryCount: number
  ): number {
    // Base time estimates in milliseconds
    const baseTimes = {
      repair: 100,
      rebuild: 500,
      partial_clear: 300,
      full_clear: 200
    };

    const baseTime = baseTimes[strategy];
    const actionTime = actionCount * 50;
    const entryTime = Math.min(entryCount * 2, 1000); // Cap at 1 second for entries

    return baseTime + actionTime + entryTime;
  }
}

export const cacheRecovery = new CacheRecovery();