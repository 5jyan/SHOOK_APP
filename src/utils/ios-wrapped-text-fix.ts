export function shouldCompensateWrappedText(platform: string, lineCount: number): boolean {
  return platform === 'ios' && lineCount > 1;
}

export function getWrappedTextHeightEpsilon(pixelRatio: number): number {
  return 1 / pixelRatio;
}
