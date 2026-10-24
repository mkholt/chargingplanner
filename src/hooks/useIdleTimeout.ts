import { useEffect } from 'react';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Call `onIdle` after `timeoutMs` without user activity. Null turns it off.
 * A hidden tab has no activity, and browsers may delay timers in background tabs,
 * so the elapsed time is also checked when the tab becomes visible.
 */
export function useIdleTimeout(onIdle: () => void, timeoutMs: number | null): void {
  useEffect(() => {
    if (timeoutMs === null) return;

    let lastActivity = Date.now();
    let timer = setTimeout(onIdle, timeoutMs);

    const onActivity = () => {
      lastActivity = Date.now();
      clearTimeout(timer);
      timer = setTimeout(onIdle, timeoutMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity >= timeoutMs) onIdle();
    };

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, onActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [onIdle, timeoutMs]);
}
