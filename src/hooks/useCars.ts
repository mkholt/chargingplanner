import { useCallback, useState } from 'react';

import {
  mergeCars as mergeCarData,
  type MergeResult,
} from '../utils/carSyncCodec';

export type Car = {
  id: string;
  name: string;
  batterySize: number;
  maxPower: number;
};

export type { MergeResult };

const LS_KEY = "ev-cars";

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

function loadCars(): Car[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCars(cars: Car[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(cars));
}

export function useCars() {
  const [cars, setCars] = useState<Car[]>(() => loadCars());

  const addCar = useCallback((car: Omit<Car, 'id'>) => {
    const newCar: Car = {
      ...car,
      id: generateId(),
    };
    setCars(prev => {
      const updated = [...prev, newCar];
      saveCars(updated);
      return updated;
    });
    return newCar;
  }, []);

  const updateCar = useCallback((id: string, updates: Partial<Omit<Car, 'id'>>) => {
    setCars(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      saveCars(updated);
      return updated;
    });
  }, []);

  const deleteCar = useCallback((id: string) => {
    setCars(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveCars(updated);
      return updated;
    });
  }, []);

  const mergeCars = useCallback((imported: Omit<Car, 'id'>[]): MergeResult => {
    let result: MergeResult = { added: [], skipped: [], total: 0 };

    setCars(prev => {
      result = mergeCarData(prev, imported, generateId);
      const updated = [...prev, ...result.added];
      saveCars(updated);
      return updated;
    });

    return result;
  }, []);

  return { cars, addCar, updateCar, deleteCar, mergeCars };
}
