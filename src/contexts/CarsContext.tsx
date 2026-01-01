import React, { createContext, useCallback, useContext } from 'react';

import { useLocalStorage } from '@/hooks';
import { LS_KEYS, mergeCars as mergeCarData, type MergeResult } from '@/utils';

// ============ Types ============

export type Car = {
  id: string;
  name: string;
  batterySize: number;
  maxPower: number;
};

/** Consolidated state for cars and selection */
type CarsState = {
  cars: Car[];
  selectedId: string | null;
};

type CarsContextType = {
  cars: Car[];
  selectedCarId: string | null;
  setSelectedCarId: (id: string | null) => void;
  addCar: (car: Omit<Car, 'id'>) => Car;
  updateCar: (id: string, updates: Partial<Omit<Car, 'id'>>) => void;
  deleteCar: (id: string) => void;
  mergeCars: (imported: Omit<Car, 'id'>[]) => MergeResult;
};

// ============ Context ============

const CarsContext = createContext<CarsContextType | null>(null);

// ============ Helpers ============

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

const DEFAULT_STATE: CarsState = { cars: [], selectedId: null };

// ============ Provider ============

export const CarsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { value: state, setValue: setState } = useLocalStorage<CarsState>(
    LS_KEYS.CARS,
    DEFAULT_STATE
  );

  const setSelectedCarId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedId: id }));
  }, [setState]);

  const addCar = useCallback((car: Omit<Car, 'id'>) => {
    const newCar: Car = { ...car, id: generateId() };
    setState(prev => ({ ...prev, cars: [...prev.cars, newCar] }));
    return newCar;
  }, [setState]);

  const updateCar = useCallback((id: string, updates: Partial<Omit<Car, 'id'>>) => {
    setState(prev => ({
      ...prev,
      cars: prev.cars.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [setState]);

  const deleteCar = useCallback((id: string) => {
    setState(prev => ({
      cars: prev.cars.filter(c => c.id !== id),
      // Atomically clear selection if deleted car was selected
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
  }, [setState]);

  const mergeCars = useCallback((imported: Omit<Car, 'id'>[]): MergeResult => {
    let result: MergeResult = { added: [], skipped: [], total: 0 };

    setState(prev => {
      result = mergeCarData(prev.cars, imported, generateId);
      return { ...prev, cars: [...prev.cars, ...result.added] };
    });

    return result;
  }, [setState]);

  return (
    <CarsContext.Provider
      value={{
        cars: state.cars,
        selectedCarId: state.selectedId,
        setSelectedCarId,
        addCar,
        updateCar,
        deleteCar,
        mergeCars,
      }}
    >
      {children}
    </CarsContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useCars(): CarsContextType {
  const context = useContext(CarsContext);
  if (!context) {
    throw new Error('useCars must be used within a CarsProvider');
  }
  return context;
}
