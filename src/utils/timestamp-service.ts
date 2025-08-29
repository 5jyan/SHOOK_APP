// TimestampService for React Native with high-precision performance measurement

interface TimestampConfig {
  format: 'local' | 'iso';
  includeMilliseconds: boolean;
  includeTimezone: boolean;
}

interface TimestampData {
  formatted: string;
  iso: string;
  timestamp: number;
  performanceTime: number;
}

interface PerformanceTimer {
  id: string;
  startTime: number;
  startPerformanceTime: number;
  label: string;
}

class TimestampService {
  private static instance: TimestampService;
  private performanceTimers = new Map<string, PerformanceTimer>();
  private performanceNowSupported: boolean;
  
  constructor() {
    this.performanceNowSupported = this.checkPerformanceNowSupport();
  }
  
  static getInstance(): TimestampService {
    if (!TimestampService.instance) {
      TimestampService.instance = new TimestampService();
    }
    return TimestampService.instance;
  }
  
  private checkPerformanceNowSupport(): boolean {
    try {
      return typeof performance !== 'undefined' && typeof performance.now === 'function';
    } catch {
      return false;
    }
  }
  
  private getPerformanceTime(): number {
    if (this.performanceNowSupported) {
      return performance.now();
    }
    return Date.now();
  }
  
  private formatLocalTimestamp(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  now(config?: Partial<TimestampConfig>): TimestampData {
    const timestamp = Date.now();
    const performanceTime = this.getPerformanceTime();
    const date = new Date(timestamp);
    
    const defaultConfig: TimestampConfig = {
      format: 'local',
      includeMilliseconds: false,
      includeTimezone: false,
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    let formatted: string;
    if (finalConfig.format === 'iso') {
      formatted = date.toISOString();
    } else {
      formatted = this.formatLocalTimestamp(date);
    }
    
    return {
      formatted,
      iso: date.toISOString(),
      timestamp,
      performanceTime,
    };
  }
  
  startTimer(label: string): string {
    const id = `${label}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer: PerformanceTimer = {
      id,
      startTime: Date.now(),
      startPerformanceTime: this.getPerformanceTime(),
      label,
    };
    
    this.performanceTimers.set(id, timer);
    return id;
  }
  
  endTimer(id: string): { duration: number; performanceDuration: number; label: string } | null {
    const timer = this.performanceTimers.get(id);
    if (!timer) {
      return null;
    }
    
    const endTime = Date.now();
    const endPerformanceTime = this.getPerformanceTime();
    
    const duration = endTime - timer.startTime;
    const performanceDuration = endPerformanceTime - timer.startPerformanceTime;
    
    this.performanceTimers.delete(id);
    
    return {
      duration,
      performanceDuration,
      label: timer.label,
    };
  }
  
  endTimerAndFormat(id: string): string {
    const result = this.endTimer(id);
    if (!result) {
      return 'Timer not found';
    }
    
    const { duration, performanceDuration, label } = result;
    const primaryDuration = this.performanceNowSupported ? performanceDuration : duration;
    
    if (primaryDuration < 1000) {
      return `${label}: ${primaryDuration.toFixed(2)}ms`;
    }
    return `${label}: ${(primaryDuration / 1000).toFixed(2)}s`;
  }
  
  clearExpiredTimers(maxAgeMs: number = 300000): void {
    const now = Date.now();
    const expiredIds: string[] = [];
    
    this.performanceTimers.forEach((timer, id) => {
      if (now - timer.startTime > maxAgeMs) {
        expiredIds.push(id);
      }
    });
    
    expiredIds.forEach(id => this.performanceTimers.delete(id));
  }
  
  getActiveTimerCount(): number {
    return this.performanceTimers.size;
  }
  
  formatDuration(durationMs: number): string {
    if (durationMs < 1000) {
      return `${durationMs.toFixed(2)}ms`;
    }
    if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    }
    return `${(durationMs / 60000).toFixed(2)}min`;
  }
}

export const timestampService = TimestampService.getInstance();

export type { TimestampConfig, TimestampData, PerformanceTimer };