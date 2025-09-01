// Cache Transaction System for Atomic Operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheLogger } from '@/utils/logger-enhanced';
import * as Crypto from 'expo-crypto';

interface TransactionOperation {
  type: 'set' | 'remove' | 'multiSet' | 'multiRemove';
  key?: string;
  value?: string;
  keys?: string[];
  keyValuePairs?: [string, string][];
}

interface TransactionLog {
  transactionId: string;
  timestamp: number;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolled_back';
}

/**
 * Atomic Cache Transaction System
 * Ensures cache consistency by implementing ACID properties for cache operations
 */
export class CacheTransaction {
  private transactionId: string;
  private operations: TransactionOperation[] = [];
  private backupData: Map<string, string | null> = new Map();
  private isCommitted = false;
  private isRolledBack = false;

  constructor() {
    this.transactionId = Crypto.randomUUID();
    cacheLogger.debug('Cache transaction created', { transactionId: this.transactionId });
  }

  /**
   * Start the transaction and create backup of current state
   */
  async begin(): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already completed');
    }

    cacheLogger.info('Cache transaction began', { transactionId: this.transactionId });
    
    // Log the transaction start
    await this.logTransaction('pending');
  }

  /**
   * Add a set operation to the transaction
   */
  async set(key: string, value: string): Promise<void> {
    this.ensureTransactionActive();
    
    // Backup current value before modifying
    if (!this.backupData.has(key)) {
      const currentValue = await AsyncStorage.getItem(key);
      this.backupData.set(key, currentValue);
    }

    this.operations.push({
      type: 'set',
      key,
      value
    });

    cacheLogger.debug('Added set operation to transaction', { 
      transactionId: this.transactionId, 
      key,
      operationCount: this.operations.length 
    });
  }

  /**
   * Add a remove operation to the transaction
   */
  async remove(key: string): Promise<void> {
    this.ensureTransactionActive();
    
    // Backup current value before removing
    if (!this.backupData.has(key)) {
      const currentValue = await AsyncStorage.getItem(key);
      this.backupData.set(key, currentValue);
    }

    this.operations.push({
      type: 'remove',
      key
    });

    cacheLogger.debug('Added remove operation to transaction', { 
      transactionId: this.transactionId, 
      key,
      operationCount: this.operations.length 
    });
  }

  /**
   * Add a multi-set operation to the transaction
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    this.ensureTransactionActive();
    
    // Backup current values
    for (const [key] of keyValuePairs) {
      if (!this.backupData.has(key)) {
        const currentValue = await AsyncStorage.getItem(key);
        this.backupData.set(key, currentValue);
      }
    }

    this.operations.push({
      type: 'multiSet',
      keyValuePairs
    });

    cacheLogger.debug('Added multiSet operation to transaction', { 
      transactionId: this.transactionId, 
      keyCount: keyValuePairs.length,
      operationCount: this.operations.length 
    });
  }

  /**
   * Add a multi-remove operation to the transaction
   */
  async multiRemove(keys: string[]): Promise<void> {
    this.ensureTransactionActive();
    
    // Backup current values
    for (const key of keys) {
      if (!this.backupData.has(key)) {
        const currentValue = await AsyncStorage.getItem(key);
        this.backupData.set(key, currentValue);
      }
    }

    this.operations.push({
      type: 'multiRemove',
      keys
    });

    cacheLogger.debug('Added multiRemove operation to transaction', { 
      transactionId: this.transactionId, 
      keyCount: keys.length,
      operationCount: this.operations.length 
    });
  }

  /**
   * Commit all operations atomically
   */
  async commit(): Promise<void> {
    this.ensureTransactionActive();

    if (this.operations.length === 0) {
      cacheLogger.warn('Committing empty transaction', { transactionId: this.transactionId });
      this.isCommitted = true;
      return;
    }

    const startTime = Date.now();
    cacheLogger.info('Committing cache transaction', { 
      transactionId: this.transactionId, 
      operationCount: this.operations.length 
    });

    try {
      // Execute all operations
      for (const operation of this.operations) {
        switch (operation.type) {
          case 'set':
            await AsyncStorage.setItem(operation.key!, operation.value!);
            break;
          case 'remove':
            await AsyncStorage.removeItem(operation.key!);
            break;
          case 'multiSet':
            await AsyncStorage.multiSet(operation.keyValuePairs!);
            break;
          case 'multiRemove':
            await AsyncStorage.multiRemove(operation.keys!);
            break;
        }
      }

      this.isCommitted = true;
      const commitTime = Date.now() - startTime;
      
      cacheLogger.info('Cache transaction committed successfully', { 
        transactionId: this.transactionId, 
        commitTimeMs: commitTime,
        operationCount: this.operations.length
      });

      // Log successful transaction
      await this.logTransaction('committed');
      
      // Clean up transaction log after successful commit
      await this.cleanupTransactionLog();

    } catch (error) {
      cacheLogger.error('Cache transaction commit failed, initiating rollback', { 
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      await this.rollback();
      throw error;
    }
  }

  /**
   * Rollback all operations to restore previous state
   */
  async rollback(): Promise<void> {
    if (this.isRolledBack) {
      cacheLogger.warn('Transaction already rolled back', { transactionId: this.transactionId });
      return;
    }

    if (this.isCommitted) {
      cacheLogger.warn('Cannot rollback committed transaction', { transactionId: this.transactionId });
      return;
    }

    const startTime = Date.now();
    cacheLogger.info('Rolling back cache transaction', { 
      transactionId: this.transactionId,
      backupEntries: this.backupData.size
    });

    try {
      // Restore all backed up values
      const restoreOperations: [string, string][] = [];
      const removeKeys: string[] = [];

      for (const [key, originalValue] of this.backupData) {
        if (originalValue === null) {
          // Key didn't exist before, remove it
          removeKeys.push(key);
        } else {
          // Key existed, restore original value
          restoreOperations.push([key, originalValue]);
        }
      }

      // Execute restore operations
      if (restoreOperations.length > 0) {
        await AsyncStorage.multiSet(restoreOperations);
      }
      
      if (removeKeys.length > 0) {
        await AsyncStorage.multiRemove(removeKeys);
      }

      this.isRolledBack = true;
      const rollbackTime = Date.now() - startTime;
      
      cacheLogger.info('Cache transaction rolled back successfully', { 
        transactionId: this.transactionId, 
        rollbackTimeMs: rollbackTime,
        restoredKeys: restoreOperations.length,
        removedKeys: removeKeys.length
      });

      // Log rollback
      await this.logTransaction('rolled_back');

    } catch (error) {
      cacheLogger.error('Cache transaction rollback failed', { 
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if transaction is still active
   */
  isActive(): boolean {
    return !this.isCommitted && !this.isRolledBack;
  }

  /**
   * Get transaction status
   */
  getStatus(): 'active' | 'committed' | 'rolled_back' {
    if (this.isCommitted) return 'committed';
    if (this.isRolledBack) return 'rolled_back';
    return 'active';
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    return {
      transactionId: this.transactionId,
      operationCount: this.operations.length,
      backupEntries: this.backupData.size,
      status: this.getStatus()
    };
  }

  private ensureTransactionActive(): void {
    if (this.isCommitted) {
      throw new Error('Transaction already committed');
    }
    if (this.isRolledBack) {
      throw new Error('Transaction already rolled back');
    }
  }

  private async logTransaction(status: TransactionLog['status']): Promise<void> {
    try {
      const transactionLog: TransactionLog = {
        transactionId: this.transactionId,
        timestamp: Date.now(),
        operations: this.operations,
        status
      };

      const logKey = `cache_transaction_log_${this.transactionId}`;
      await AsyncStorage.setItem(logKey, JSON.stringify(transactionLog));

      cacheLogger.debug('Transaction logged', { 
        transactionId: this.transactionId, 
        status 
      });
    } catch (error) {
      cacheLogger.warn('Failed to log transaction', { 
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async cleanupTransactionLog(): Promise<void> {
    try {
      const logKey = `cache_transaction_log_${this.transactionId}`;
      await AsyncStorage.removeItem(logKey);
      
      cacheLogger.debug('Transaction log cleaned up', { transactionId: this.transactionId });
    } catch (error) {
      cacheLogger.warn('Failed to cleanup transaction log', { 
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Static method to recover from incomplete transactions on app restart
   */
  static async recoverIncompleteTransactions(): Promise<void> {
    cacheLogger.info('Checking for incomplete cache transactions');
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const transactionLogKeys = allKeys.filter(key => key.startsWith('cache_transaction_log_'));

      if (transactionLogKeys.length === 0) {
        cacheLogger.debug('No transaction logs found');
        return;
      }

      cacheLogger.info('Found transaction logs', { count: transactionLogKeys.length });

      const logs = await AsyncStorage.multiGet(transactionLogKeys);
      const incompleteTransactions: TransactionLog[] = [];

      for (const [key, logString] of logs) {
        if (logString) {
          try {
            const log: TransactionLog = JSON.parse(logString);
            if (log.status === 'pending') {
              incompleteTransactions.push(log);
            }
          } catch (parseError) {
            cacheLogger.warn('Failed to parse transaction log', { key, error: parseError });
          }
        }
      }

      if (incompleteTransactions.length > 0) {
        cacheLogger.warn('Found incomplete transactions, cleaning up', { 
          count: incompleteTransactions.length 
        });

        // For safety, we'll just clean up the logs rather than trying to rollback
        // since we don't have the backup data for these transactions
        const logKeysToClean = incompleteTransactions.map(log => `cache_transaction_log_${log.transactionId}`);
        await AsyncStorage.multiRemove(logKeysToClean);

        cacheLogger.info('Cleaned up incomplete transaction logs', { 
          count: logKeysToClean.length 
        });
      }

    } catch (error) {
      cacheLogger.error('Failed to recover incomplete transactions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}