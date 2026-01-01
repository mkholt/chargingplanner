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

      expect(result.current[0]).toBe('08:00');
    });

    it('returns stored value when localStorage has data', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = JSON.stringify('06:00');

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current[0]).toBe('06:00');
    });

    it('returns initialValue when localStorage has invalid JSON', () => {
      localStorageStore[LS_KEYS.DEFAULT_EARLIEST] = 'not valid json {{{';

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      expect(result.current[0]).toBe('08:00');
    });
  });

  describe('value updates', () => {
    it('direct value updates persist to localStorage', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        result.current[1]('10:00');
      });

      expect(result.current[0]).toBe('10:00');
      expect(localStorageStore[LS_KEYS.DEFAULT_EARLIEST]).toBe(
        JSON.stringify('10:00')
      );
    });

    it('functional updates work correctly', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, '08:00')
      );

      act(() => {
        result.current[1]((prev) => prev + ':30');
      });

      expect(result.current[0]).toBe('08:00:30');
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
        result.current[1]('10:00');
      });

      // Functional update should receive updated value
      act(() => {
        result.current[1]((prev) => `${prev}-modified`);
      });

      expect(result.current[0]).toBe('10:00-modified');
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
        result.current[1]('10:00');
      });

      expect(result.current[0]).toBe('10:00');
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
        useLocalStorage(LS_KEYS.SELECTED_CAR, initialValue)
      );

      expect(result.current[0]).toEqual(initialValue);

      const updatedValue: CarSettings = {
        batterySize: 80,
        chargingPower: 22,
        name: 'Updated Car',
      };

      act(() => {
        result.current[1](updatedValue);
      });

      expect(result.current[0]).toEqual(updatedValue);
      expect(localStorageStore[LS_KEYS.SELECTED_CAR]).toBe(
        JSON.stringify(updatedValue)
      );
    });

    it('deserializes stored complex objects correctly', () => {
      const storedValue = {
        batterySize: 75,
        chargingPower: 7.4,
        name: 'Stored Car',
      };

      localStorageStore[LS_KEYS.SELECTED_CAR] = JSON.stringify(storedValue);

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.SELECTED_CAR, {
          batterySize: 0,
          chargingPower: 0,
          name: '',
        })
      );

      expect(result.current[0]).toEqual(storedValue);
    });

    it('handles arrays correctly', () => {
      const initialArray = ['item1', 'item2'];

      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.LANGUAGE, initialArray)
      );

      act(() => {
        result.current[1]((prev) => [...(prev as string[]), 'item3']);
      });

      expect(result.current[0]).toEqual(['item1', 'item2', 'item3']);
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

      expect(result.current[0]).toEqual(nestedObject);

      const updatedNested = {
        level1: {
          level2: {
            value: 'updated',
          },
        },
        array: [4, 5, 6],
      };

      act(() => {
        result.current[1](updatedNested);
      });

      expect(result.current[0]).toEqual(updatedNested);
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

      expect(result.current[0]).toBe(42);

      act(() => {
        result.current[1](100);
      });

      expect(result.current[0]).toBe(100);
    });

    it('handles boolean values', () => {
      const { result } = renderHook(() =>
        useLocalStorage(LS_KEYS.DEFAULT_EARLIEST, false)
      );

      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it('handles null values', () => {
      const { result } = renderHook(() =>
        useLocalStorage<string | null>(LS_KEYS.SELECTED_CAR, null)
      );

      expect(result.current[0]).toBeNull();

      act(() => {
        result.current[1]('some value');
      });

      expect(result.current[0]).toBe('some value');
    });
  });
});
