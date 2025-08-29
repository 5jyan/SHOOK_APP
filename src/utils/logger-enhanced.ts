// Enhanced Logger for React Native with AsyncStorage persistence
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { timestampService, TimestampData } from './timestamp-service';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Environment-based log level
const getLogLevel = (): LogLevel => {
  if (__DEV__) {
    return LogLevel.DEBUG; // Show all logs in development
  }
  return LogLevel.WARN; // Only warnings and errors in production
};

// Sensitive data patterns to mask
const SENSITIVE_PATTERNS = [
  /token['":\s=]*['"]([^'"]*)['"]/gi,
  /password['":\s=]*['"]([^'"]*)['"]/gi,
  /secret['":\s=]*['"]([^'"]*)['"]/gi,
  /authorization['":\s=]*['"]([^'"]*)['"]/gi,
  /cookie['":\s=]*['"]([^'"]*)['"]/gi,
  /session['":\s=]*['"]([^'"]*)['"]/gi,
  /api[_-]?key['":\s=]*['"]([^'"]*)['"]/gi,
  /access[_-]?token['":\s=]*['"]([^'"]*)['"]/gi,
  /refresh[_-]?token['":\s=]*['"]([^'"]*)['"]/gi,
  /bearer\s+([^\s]+)/gi,
  /ExponentPushToken\[([^\]]+)\]/gi,
];

// Mask sensitive data in strings
const maskSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    let maskedData = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      maskedData = maskedData.replace(pattern, (match, sensitive) => {
        if (sensitive && sensitive.length > 6) {
          return match.replace(sensitive, `${sensitive.slice(0, 3)}...${sensitive.slice(-3)}`);
        }
        return match.replace(sensitive, '***');
      });
    });
    return maskedData;
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => maskSensitiveData(item));
    }
    
    const maskedObject: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if key itself is sensitive
      if (/token|password|secret|auth|cookie|session|key/i.test(key)) {
        if (typeof value === 'string' && value.length > 6) {
          maskedObject[key] = `${value.slice(0, 3)}...${value.slice(-3)}`;
        } else {
          maskedObject[key] = '***';
        }
      } else {
        maskedObject[key] = maskSensitiveData(value);
      }
    }
    return maskedObject;
  }
  
  return data;
};

// Enhanced log entry interface with OpenTelemetry compatibility
interface EnhancedLogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  metadata?: any;
  platform: string;
  // OpenTelemetry compatible fields
  '@timestamp'?: string;
  severity?: string;
  attributes?: Record<string, any>;
  correlationId?: string;
  performanceTime?: number;
  duration?: number;
}

// Legacy interface for backward compatibility
type LogEntry = EnhancedLogEntry;

// Logger class
class Logger {
  private category: string;
  private emoji: string;
  private currentLogLevel: LogLevel;
  private correlationId?: string;

  constructor(category: string, emoji: string) {
    this.category = category;
    this.emoji = emoji;
    this.currentLogLevel = getLogLevel();
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private formatMessage(level: string, message: string, metadata?: any, timestampData?: TimestampData): string {
    const timestamp = timestampData?.formatted || timestampService.now().formatted;
    let formattedMessage = `${timestamp} ${this.emoji} [${this.category}] ${message}`;
    
    if (metadata) {
      formattedMessage += ` ${JSON.stringify(maskSensitiveData(metadata))}`;
    }
    
    return formattedMessage;
  }

  private async persistLog(entry: EnhancedLogEntry): Promise<void> {
    try {
      const logsKey = `app_logs_${new Date().toISOString().split('T')[0]}`;
      const existingLogs = await AsyncStorage.getItem(logsKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(entry);
      
      // Keep only last 100 entries per day to prevent storage bloat
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem(logsKey, JSON.stringify(logs));
    } catch (error) {
      // Fallback if AsyncStorage fails - just console log
      console.warn('Failed to persist log to AsyncStorage:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, metadata?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestampData = timestampService.now();
    const maskedMetadata = metadata ? maskSensitiveData(metadata) : undefined;
    const formattedMessage = this.formatMessage(levelName, message, maskedMetadata, timestampData);
    
    // Console output with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // Create enhanced log entry for persistence with OpenTelemetry compatibility
    const logEntry: EnhancedLogEntry = {
      timestamp: timestampData.formatted,
      '@timestamp': timestampData.iso,
      level: levelName,
      severity: levelName.toLowerCase(),
      category: this.category,
      message,
      metadata: maskedMetadata,
      attributes: maskedMetadata,
      platform: Platform.OS,
      correlationId: this.correlationId,
      performanceTime: timestampData.performanceTime,
    };

    // Persist log asynchronously (don't await to avoid blocking)
    this.persistLog(logEntry).catch(() => {
      // Silently fail if persistence fails
    });
  }

  debug(message: string, metadata?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, metadata);
  }

  // Performance measurement methods
  startTimer(label: string): string {
    const timerId = timestampService.startTimer(`${this.category}:${label}`);
    this.debug(`Timer started: ${label}`, { timerId });
    return timerId;
  }

  endTimer(timerId: string, message?: string): void {
    const result = timestampService.endTimer(timerId);
    if (result) {
      const logMessage = message || `Timer completed: ${result.label}`;
      const metadata = {
        duration: result.duration,
        performanceDuration: result.performanceDuration,
        timerId,
      };
      
      if (result.performanceDuration > 1000) {
        this.warn(`${logMessage} (slow operation)`, metadata);
      } else {
        this.info(logMessage, metadata);
      }
    } else {
      this.warn(`Timer not found: ${timerId}`);
    }
  }

  timeAsync<T>(label: string, asyncFn: () => Promise<T>): Promise<T> {
    const timerId = this.startTimer(label);
    return asyncFn()
      .then(result => {
        this.endTimer(timerId, `Async operation completed: ${label}`);
        return result;
      })
      .catch(error => {
        this.endTimer(timerId, `Async operation failed: ${label}`);
        this.error(`Async operation error: ${label}`, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      });
  }

  timeSync<T>(label: string, syncFn: () => T): T {
    const timerId = this.startTimer(label);
    try {
      const result = syncFn();
      this.endTimer(timerId, `Sync operation completed: ${label}`);
      return result;
    } catch (error) {
      this.endTimer(timerId, `Sync operation failed: ${label}`);
      this.error(`Sync operation error: ${label}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Correlation ID methods
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    this.debug('Correlation ID set', { correlationId });
  }

  clearCorrelationId(): void {
    const oldId = this.correlationId;
    this.correlationId = undefined;
    this.debug('Correlation ID cleared', { oldCorrelationId: oldId });
  }

  withCorrelationId(correlationId: string, fn: () => void): void {
    const oldId = this.correlationId;
    this.setCorrelationId(correlationId);
    try {
      fn();
    } finally {
      if (oldId) {
        this.setCorrelationId(oldId);
      } else {
        this.clearCorrelationId();
      }
    }
  }
}

// Category-specific loggers with emojis
export const apiLogger = new Logger('API', '📡');
export const cacheLogger = new Logger('Cache', '📦');
export const notificationLogger = new Logger('Notification', '🔔');
export const uiLogger = new Logger('UI', '🎨');
export const configLogger = new Logger('Config', '⚙️');
export const serviceLogger = new Logger('Service', '🔧');
export const authLogger = new Logger('Auth', '🔐');

// Utility function to clear old logs
export const clearOldLogs = async (daysToKeep: number = 7): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const logKeys = allKeys.filter(key => key.startsWith('app_logs_'));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const keysToDelete = logKeys.filter(key => {
      const dateStr = key.replace('app_logs_', '');
      const logDate = new Date(dateStr);
      return logDate < cutoffDate;
    });
    
    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
      configLogger.info(`Cleared ${keysToDelete.length} old log files`);
    }
  } catch (error) {
    configLogger.error('Failed to clear old logs', { error });
  }
};

// Export log retrieval function for debugging
export const getStoredLogs = async (date?: string): Promise<EnhancedLogEntry[]> => {
  try {
    const logDate = date || new Date().toISOString().split('T')[0];
    const logsKey = `app_logs_${logDate}`;
    const logs = await AsyncStorage.getItem(logsKey);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    configLogger.error('Failed to retrieve logs', { error, date });
    return [];
  }
};

// Export performance monitoring utilities
export const getTimerStats = () => ({
  activeTimers: timestampService.getActiveTimerCount(),
  clearExpiredTimers: (maxAgeMs?: number) => timestampService.clearExpiredTimers(maxAgeMs),
  formatDuration: (durationMs: number) => timestampService.formatDuration(durationMs),
});

// Export enhanced log entry interface for external use
export type { EnhancedLogEntry, LogEntry };

// Initialize logger system
configLogger.info('Enhanced Logger initialized', {
  platform: Platform.OS,
  logLevel: LogLevel[getLogLevel()],
  isDev: __DEV__,
});

// Clean up old logs on initialization (don't await)
clearOldLogs().catch(() => {
  // Silently fail if cleanup fails
});