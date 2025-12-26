import React, { createContext, useCallback, useContext, useState } from 'react';

import { mergeCars as mergeCarData, type MergeResult } from '@/utils';

// ============ Types ============

export type Car = {
  id: string;
  name: string;
  batterySize: number;
  maxPower: number;
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

// ============ Storage ============

const LS_KEY = 'ev-cars';
const LS_SELECTED_KEY = 'ev-selected-car';

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

function loadSelectedCarId(cars: Car[]): string | null {
  try {
    const id = localStorage.getItem(LS_SELECTED_KEY);
    // Validate the ID exists in the cars list
    if (id && cars.some(c => c.id === id)) {
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSelectedCarId(id: string | null) {
  if (id) {
    localStorage.setItem(LS_SELECTED_KEY, id);
  } else {
    localStorage.removeItem(LS_SELECTED_KEY);
  }
}

// ============ Provider ============

export const CarsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cars, setCars] = useState<Car[]>(() => loadCars());
  const [selectedCarId, setSelectedCarIdState] = useState<string | null>(() => {
    const loadedCars = loadCars();
    return loadSelectedCarId(loadedCars);
  });

  const setSelectedCarId = useCallback((id: string | null) => {
    setSelectedCarIdState(id);
    saveSelectedCarId(id);
  }, []);

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
    // Clear selection if the deleted car was selected
    setSelectedCarIdState(prev => {
      if (prev === id) {
        saveSelectedCarId(null);
        return null;
      }
      return prev;
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

  return (
    <CarsContext.Provider
      value={{
        cars,
        selectedCarId,
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
