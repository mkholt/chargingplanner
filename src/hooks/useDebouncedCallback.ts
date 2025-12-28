import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced version of the callback that delays invocation
 * until `delay` ms have passed since the last call.
 *
 * The callback is always called with the latest arguments.
 * The returned function has stable identity (won't cause re-renders).
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback ref up to date (in an effect, not during render)
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
