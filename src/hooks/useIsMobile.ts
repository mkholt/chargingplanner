import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

const getSnapshot = (): boolean => {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
};

const getServerSnapshot = (): boolean => {
  return false; // Default to non-mobile on server
};

const subscribe = (callback: () => void): (() => void) => {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
};

export const useIsMobile = (): boolean => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
