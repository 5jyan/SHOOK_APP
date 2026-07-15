export function buildYouTubeTimestampUrl(videoId: string, timestampSeconds: number): string {
  const seconds = Math.max(0, Math.floor(timestampSeconds));
  return `https://youtu.be/${encodeURIComponent(videoId)}?t=${seconds}`;
}
