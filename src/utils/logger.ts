/**
 * Logger utility with timestamps
 * Formats timestamp as MM-DD HH:mm:ss
 */

function getTimestamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

/**
 * Initialize timestamped logging
 * Overrides console methods to include timestamps
 */
export function initializeLogger() {
  console.log = (...args: any[]) => {
    originalConsole.log(`[${getTimestamp()}]`, ...args);
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(`[${getTimestamp()}]`, ...args);
  };

  console.error = (...args: any[]) => {
    originalConsole.error(`[${getTimestamp()}]`, ...args);
  };

  console.info = (...args: any[]) => {
    originalConsole.info(`[${getTimestamp()}]`, ...args);
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(`[${getTimestamp()}]`, ...args);
  };

  // Log that logger has been initialized
  console.log('🚀 Logger initialized with timestamps');
}

/**
 * Restore original console methods
 */
export function restoreLogger() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}