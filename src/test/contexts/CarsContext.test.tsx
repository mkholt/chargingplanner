import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CarsProvider, useCars, type Car } from '@/contexts/CarsContext';
import { stubLocalStorage } from '@/test/utils/testUtils';

describe('CarsContext', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    stubLocalStorage(localStorageStore);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CarsProvider>{children}</CarsProvider>
  );

  describe('initial state', () => {
    it('starts with empty cars array when localStorage is empty', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      expect(result.current.cars).toEqual([]);
      expect(result.current.selectedCarId).toBeNull();
    });

    it('loads cars from localStorage on init', () => {
      const existingCars: Car[] = [
        { id: '1', name: 'Tesla', batterySize: 60, maxPower: 11 },
      ];
      localStorageStore['ev-cars'] = JSON.stringify(existingCars);

      const { result } = renderHook(() => useCars(), { wrapper });

      expect(result.current.cars).toHaveLength(1);
      expect(result.current.cars[0].name).toBe('Tesla');
    });

    it('loads selected car ID from localStorage when car exists', () => {
      const existingCars: Car[] = [
        { id: 'car-1', name: 'Tesla', batterySize: 60, maxPower: 11 },
      ];
      localStorageStore['ev-cars'] = JSON.stringify(existingCars);
      localStorageStore['ev-selected-car'] = 'car-1';

      const { result } = renderHook(() => useCars(), { wrapper });

      expect(result.current.selectedCarId).toBe('car-1');
    });

    it('ignores selected car ID if car does not exist', () => {
      const existingCars: Car[] = [
        { id: 'car-1', name: 'Tesla', batterySize: 60, maxPower: 11 },
      ];
      localStorageStore['ev-cars'] = JSON.stringify(existingCars);
      localStorageStore['ev-selected-car'] = 'non-existent-id';

      const { result } = renderHook(() => useCars(), { wrapper });

      expect(result.current.selectedCarId).toBeNull();
    });
  });

  describe('addCar', () => {
    it('adds a new car with generated ID', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let newCar: Car;
      act(() => {
        newCar = result.current.addCar({
          name: 'Tesla Model 3',
          batterySize: 60,
          maxPower: 11,
        });
      });

      expect(result.current.cars).toHaveLength(1);
      expect(result.current.cars[0].name).toBe('Tesla Model 3');
      expect(result.current.cars[0].id).toBeDefined();
      expect(newCar!.id).toBe(result.current.cars[0].id);
    });

    it('persists added car to localStorage', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      act(() => {
        result.current.addCar({
          name: 'Tesla',
          batterySize: 60,
          maxPower: 11,
        });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ev-cars',
        expect.stringContaining('Tesla')
      );
    });
  });

  describe('updateCar', () => {
    it('updates car properties', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({
          name: 'Tesla',
          batterySize: 60,
          maxPower: 11,
        });
        carId = car.id;
      });

      act(() => {
        result.current.updateCar(carId!, { batterySize: 75, name: 'Tesla Long Range' });
      });

      expect(result.current.cars[0].name).toBe('Tesla Long Range');
      expect(result.current.cars[0].batterySize).toBe(75);
      expect(result.current.cars[0].maxPower).toBe(11); // Unchanged
    });

    it('persists update to localStorage', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        carId = car.id;
      });

      vi.mocked(localStorage.setItem).mockClear();

      act(() => {
        result.current.updateCar(carId!, { batterySize: 75 });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ev-cars',
        expect.stringContaining('75')
      );
    });
  });

  describe('deleteCar', () => {
    it('removes car from list', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        carId = car.id;
      });

      expect(result.current.cars).toHaveLength(1);

      act(() => {
        result.current.deleteCar(carId!);
      });

      expect(result.current.cars).toHaveLength(0);
    });

    it('clears selection when deleted car was selected', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        carId = car.id;
        result.current.setSelectedCarId(car.id);
      });

      expect(result.current.selectedCarId).toBe(carId!);

      act(() => {
        result.current.deleteCar(carId!);
      });

      expect(result.current.selectedCarId).toBeNull();
    });

    it('does not clear selection when different car was deleted', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let car1Id: string;
      let car2Id: string;
      act(() => {
        const car1 = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        const car2 = result.current.addCar({ name: 'VW', batterySize: 77, maxPower: 11 });
        car1Id = car1.id;
        car2Id = car2.id;
        result.current.setSelectedCarId(car1.id);
      });

      act(() => {
        result.current.deleteCar(car2Id!);
      });

      expect(result.current.selectedCarId).toBe(car1Id!);
    });
  });

  describe('setSelectedCarId', () => {
    it('updates selected car ID', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        carId = car.id;
      });

      act(() => {
        result.current.setSelectedCarId(carId!);
      });

      expect(result.current.selectedCarId).toBe(carId!);
    });

    it('persists selection to localStorage', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      let carId: string;
      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        carId = car.id;
      });

      vi.mocked(localStorage.setItem).mockClear();

      act(() => {
        result.current.setSelectedCarId(carId!);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('ev-selected-car', carId!);
    });

    it('removes selection from localStorage when set to null', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      act(() => {
        const car = result.current.addCar({ name: 'Tesla', batterySize: 60, maxPower: 11 });
        result.current.setSelectedCarId(car.id);
      });

      vi.mocked(localStorage.removeItem).mockClear();

      act(() => {
        result.current.setSelectedCarId(null);
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('ev-selected-car');
    });
  });

  describe('mergeCars', () => {
    it('adds new cars and skips duplicates', () => {
      const { result } = renderHook(() => useCars(), { wrapper });

      act(() => {
        result.current.addCar({ name: 'Existing Car', batterySize: 50, maxPower: 7 });
      });

      // Verify the car was added
      expect(result.current.cars).toHaveLength(1);

      act(() => {
        result.current.mergeCars([
          { name: 'Existing Car', batterySize: 60, maxPower: 11 }, // Duplicate (case-insensitive)
          { name: 'New Car', batterySize: 70, maxPower: 22 }, // New
        ]);
      });

      // Verify the merge behavior through observable state
      expect(result.current.cars).toHaveLength(2);
      expect(result.current.cars.find(c => c.name === 'Existing Car')).toBeDefined();
      expect(result.current.cars.find(c => c.name === 'New Car')).toBeDefined();
      // Verify the duplicate wasn't updated (still has original batterySize)
      expect(result.current.cars.find(c => c.name === 'Existing Car')?.batterySize).toBe(50);
    });
  });

  describe('error handling', () => {
    it('throws error when useCars is used outside provider', () => {
      expect(() => {
        renderHook(() => useCars());
      }).toThrow('useCars must be used within a CarsProvider');
    });
  });
});
