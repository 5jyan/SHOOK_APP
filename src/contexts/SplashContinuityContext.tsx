import React, { createContext, useContext } from 'react';

const SplashContinuityContext = createContext<(() => void) | null>(null);

export const SplashContinuityProvider = SplashContinuityContext.Provider;

export function useMarkSplashContinuityReady() {
  return useContext(SplashContinuityContext);
}
