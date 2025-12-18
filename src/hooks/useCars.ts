import { useCallback, useState } from 'react';

export type Car = {
  id: string;
  name: string;
  batterySize: number;
  maxPower: number;
};

const LS_KEY = "ev-cars";

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
      id: Math.random().toString(36).slice(2),
    };
    setCars(prev => {
      const updated = [...prev, newCar];
      saveCars(updated);
      return updated;
    });
    return newCar;
  }, []);

  const deleteCar = useCallback((id: string) => {
    setCars(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveCars(updated);
      return updated;
    });
  }, []);

  return { cars, addCar, deleteCar };
}
