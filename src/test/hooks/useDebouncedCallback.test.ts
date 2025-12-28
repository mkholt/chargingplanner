import { renderHook, act } from '@testing-library/react';

import { useDebouncedCallback } from '@/hooks';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce behavior', () => {
    it('does not call callback immediately', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('test');
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls callback after delay', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('test');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('only calls callback once for multiple rapid calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('call-1');
        result.current('call-2');
        result.current('call-3');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call-3'); // Last call wins
    });

    it('resets timer on each call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('first');
      });

      // Advance 200ms (not enough to trigger)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).not.toHaveBeenCalled();

      // Make another call - should reset the timer
      act(() => {
        result.current('second');
      });

      // Advance another 200ms (400ms total, but timer was reset)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).not.toHaveBeenCalled();

      // Advance the remaining 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledWith('second');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('callback reference', () => {
    it('uses the latest callback reference', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ callback }) => useDebouncedCallback(callback, 300),
        { initialProps: { callback: callback1 } }
      );

      act(() => {
        result.current('test');
      });

      // Change the callback before timer fires
      rerender({ callback: callback2 });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should call the new callback, not the old one
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('test');
    });
  });

  describe('returned function stability', () => {
    it('returns a stable function reference when delay stays the same', () => {
      const callback = vi.fn();
      const { result, rerender } = renderHook(
        ({ cb }) => useDebouncedCallback(cb, 300),
        { initialProps: { cb: callback } }
      );

      const firstRef = result.current;

      // Rerender with new callback but same delay
      rerender({ cb: vi.fn() });

      expect(result.current).toBe(firstRef);
    });

    it('returns a new function reference when delay changes', () => {
      const callback = vi.fn();
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { delay: 300 } }
      );

      const firstRef = result.current;

      // Rerender with new delay
      rerender({ delay: 500 });

      expect(result.current).not.toBe(firstRef);
    });
  });

  describe('multiple arguments', () => {
    it('passes all arguments to the callback', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('arg1', 'arg2', 123);
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });
});
