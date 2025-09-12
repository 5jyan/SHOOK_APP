/**
 * Korean-style number formatting utilities
 */

/**
 * Format subscriber count in Korean style
 * - 1억 이상: xx억
 * - 1만 이상: xx만 
 * - 1천 이상: 0.x만
 * - 그 이하: 숫자 그대로
 */
export function formatSubscriberCount(count: number): string {
  if (count >= 100_000_000) {
    const eok = Math.floor(count / 100_000_000);
    const remainder = Math.floor((count % 100_000_000) / 10_000_000);
    if (remainder > 0) {
      return `${eok}.${remainder}억`;
    }
    return `${eok}억`;
  }
  
  if (count >= 10_000) {
    const man = Math.floor(count / 10_000);
    const remainder = Math.floor((count % 10_000) / 1_000);
    if (remainder > 0) {
      return `${man}.${remainder}만`;
    }
    return `${man}만`;
  }
  
  if (count >= 1_000) {
    const decimal = Math.floor(count / 1_000) / 10;
    return `${decimal}만`;
  }
  
  return count.toString();
}

/**
 * Format video count as simple number with thousands separator
 */
export function formatVideoCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Combined format for displaying both subscriber and video counts
 */
export function formatChannelStats(subscriberCount: number, videoCount: number): {
  subscribers: string;
  videos: string;
} {
  return {
    subscribers: formatSubscriberCount(subscriberCount),
    videos: formatVideoCount(videoCount)
  };
}