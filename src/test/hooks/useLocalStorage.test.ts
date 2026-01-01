import { renderHook, act } from '@testing-library/react';

import { useLocalStorage } from '@/hooks';
import { LS_KEYS } from '@/utils';

import { stubLocalStorage } from '../utils/testUtils';

describe('useLocalStorage', () => {
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};
    stubLocalStorage(localStorageStore);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial value handling', () => {
    it('returns initialValue when localStorage is empty', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('08:00');
    });

    it('returns stored value when localStorage has data', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = JSON.stringify('06:00');

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('06:00');
    });

    it('returns initialValue when localStorage has invalid JSON', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = 'not valid json {{{';

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('08:00');
    });
  });

  describe('value updates', () => {
    it('direct value updates persist to localStorage', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        result.current.setValue('10:00');
      });

      expect(result.current.value).toBe('10:00');
      expect(localStorageStore[LS_KEYS.DEFAULT_EARLIEST]).toBe(
        JSON.stringify('10:00')
      );
    });

    it('functional updates work correctly', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        result.current.setValue((prev) => prev + ':30');
      });

      expect(result.current.value).toBe('08:00:30');
      expect(localStorageStore[LS_KEYS.DEFAULT_EARLIEST]).toBe(
        JSON.stringify('08:00:30')
      );
    });

    it('functional updates receive the current state value', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      // First update
      act(() => {
        result.current.setValue('10:00');
      });

      // Functional update should receive updated value
      act(() => {
        result.current.setValue((prev) => `${prev}-modified`);
      });

      expect(result.current.value).toBe('10:00-modified');
    });
  });

  describe('clearValue', () => {
    it('removes key from localStorage and resets to initial value', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = JSON.stringify('10:00');

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('10:00');

      act(() => {
        result.current.clearValue();
      });

      expect(result.current.value).toBe('08:00');
      expect(localStorageStore[LS_KEYS.DEFAULT_EARLIEST]).toBeUndefined();
    });

    it('calls localStorage.removeItem', () => {
      const removeItemSpy = vi.fn();
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: removeItemSpy,
        clear: vi.fn(),
      });

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        result.current.clearValue();
      });

      expect(removeItemSpy).toHaveBeenCalledWith(LS_KEYS.DEFAULT_EARLIEST);
    });
  });

  describe('error handling', () => {
    it('handles localStorage.setItem throwing (quota exceeded) - state should still update', () => {
      // Create a custom localStorage mock that throws on setItem
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      // Should not throw and state should still update
      act(() => {
        result.current.setValue('10:00');
      });

      expect(result.current.value).toBe('10:00');
    });

    it('handles localStorage.removeItem throwing - state should still reset', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => JSON.stringify('10:00')),
        setItem: vi.fn(),
        removeItem: vi.fn(() => {
          throw new Error('StorageError');
        }),
        clear: vi.fn(),
      });

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      // Should not throw and state should still reset
      act(() => {
        result.current.clearValue();
      });

      expect(result.current.value).toBe('08:00');
    });
  });

  describe('complex object types', () => {
    it('serializes and deserializes complex objects correctly', () => {
      interface CarSettings {
        batterySize: number;
        chargingPower: number;
        name: string;
      }

      const initialValue: CarSettings = {
        batterySize: 60,
        chargingPower: 11,
        name: 'Test Car',
      };

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.CARS, initialValue)
      );

      expect(result.current.value).toEqual(initialValue);

      const updatedValue: CarSettings = {
        batterySize: 80,
        chargingPower: 22,
        name: 'Updated Car',
      };

      act(() => {
        result.current.setValue(updatedValue);
      });

      expect(result.current.value).toEqual(updatedValue);
      expect(localStorageStore[LS_KEYS.CARS]).toBe(
        JSON.stringify(updatedValue)
      );
    });

    it('deserializes stored complex objects correctly', () => {
      const storedValue = {
        batterySize: 75,
        chargingPower: 7.4,
        name: 'Stored Car',
      };

      localStorageStore[LS_KEYS.CARS] = JSON.stringify(storedValue);

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.CARS, {
          batterySize: 0,
          chargingPower: 0,
          name: '',
        })
      );

      expect(result.current.value).toEqual(storedValue);
    });

    it('handles arrays correctly', () => {
      const initialArray = ['item1', 'item2'];

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.LANGUAGE, initialArray)
      );

      act(() => {
        result.current.setValue((prev) => [...(prev as string[]), 'item3']);
      });

      expect(result.current.value).toEqual(['item1', 'item2', 'item3']);
    });

    it('handles nested objects correctly', () => {
      const nestedObject = {
        level1: {
          level2: {
            value: 'deep',
          },
        },
        array: [1, 2, 3],
      };

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.PRICE_SETTINGS, nestedObject)
      );

      expect(result.current.value).toEqual(nestedObject);

      const updatedNested = {
        level1: {
          level2: {
            value: 'updated',
          },
        },
        array: [4, 5, 6],
      };

      act(() => {
        result.current.setValue(updatedNested);
      });

      expect(result.current.value).toEqual(updatedNested);
      expect(JSON.parse(localStorageStore[LS_KEYS.PRICE_SETTINGS])).toEqual(
        updatedNested
      );
    });
  });

  describe('different value types', () => {
    it('handles number values', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, 42)
      );

      expect(result.current.value).toBe(42);

      act(() => {
        result.current.setValue(100);
      });

      expect(result.current.value).toBe(100);
    });

    it('handles boolean values', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, false)
      );

      expect(result.current.value).toBe(false);

      act(() => {
        result.current.setValue(true);
      });

      expect(result.current.value).toBe(true);
    });

    it('handles null values', () => {
      const { result } = renderHook(() =>
        useLocalStorage<string | null>(LS_KEYS.LANGUAGE, null)
      );

      expect(result.current.value).toBeNull();

      act(() => {
        result.current.setValue('some value');
      });

      expect(result.current.value).toBe('some value');
    });
  });

  describe('cross-tab sync', () => {
    it('updates state when storage event fires with new value', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('08:00');

      // Simulate storage event from another tab
      act(() => {
        const event = new StorageEvent('storage', {
          key: LS_KEYS.DEFAULT_EARLIEST,
          newValue: JSON.stringify('10:00'),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.value).toBe('10:00');
    });

    it('resets to initial value when storage event indicates key removal', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = JSON.stringify('10:00');

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current.value).toBe('10:00');

      // Simulate key removal from another tab
      act(() => {
        const event = new StorageEvent('storage', {
          key: LS_KEYS.DEFAULT_EARLIEST,
          newValue: null,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.value).toBe('08:00');
    });

    it('ignores storage events for different keys', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        const event = new StorageEvent('storage', {
          key: LS_KEYS.DEFAULT_LATEST,
          newValue: JSON.stringify('22:00'),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.value).toBe('08:00');
    });

    it('ignores storage events with invalid JSON', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        const event = new StorageEvent('storage', {
          key: LS_KEYS.DEFAULT_EARLIEST,
          newValue: 'not valid json {{{',
        });
        window.dispatchEvent(event);
      });

      // Should remain unchanged
      expect(result.current.value).toBe('08:00');
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
