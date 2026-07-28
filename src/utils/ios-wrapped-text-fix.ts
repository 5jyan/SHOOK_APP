export const IOS_TEXT_LAYOUT_SAFETY_SLACK = 1;

/**
 * React Native Fabric can lose a physical pixel when the native text
 * measurement crosses the JS/float/Yoga boundary. Padding cannot compensate
 * for this because Fabric subtracts it again when creating the text content
 * frame. A minHeight guard grows the frame TextKit actually draws into.
 *
 * React Native fixed the native rounding in facebook/react-native#57698.
 * Keep this OTA-safe bridge until the app ships a React Native version that
 * contains that fix.
 */
export function getIOSMeasuredTextMinHeight(
  platform: string,
  measuredHeight: number,
): number | undefined {
  if (platform !== 'ios' || !Number.isFinite(measuredHeight) || measuredHeight <= 0) {
    return undefined;
  }

  return measuredHeight + IOS_TEXT_LAYOUT_SAFETY_SLACK;
}
