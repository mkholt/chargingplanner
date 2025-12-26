import React, { createContext, useCallback, useContext, useState } from 'react';

// ============ Types ============

type ChargingFormContextType = {
  batterySize: number;
  chargingSpeed: number;
  setBatterySize: (size: number) => void;
  setChargingSpeed: (speed: number) => void;
  syncWithCar: (batterySize: number, maxPower: number) => void;
};

// ============ Context ============

const ChargingFormContext = createContext<ChargingFormContextType | null>(null);

// ============ Provider ============

export const ChargingFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batterySize, setBatterySize] = useState(60);
  const [chargingSpeed, setChargingSpeed] = useState(11);

  // Sync form with car values (used when car is selected or edited)
  const syncWithCar = useCallback((carBatterySize: number, carMaxPower: number) => {
    setBatterySize(carBatterySize);
    // Cap charging speed at car's max power
    setChargingSpeed(current => Math.min(current, carMaxPower));
  }, []);

  return (
    <ChargingFormContext.Provider
      value={{
        batterySize,
        chargingSpeed,
        setBatterySize,
        setChargingSpeed,
        syncWithCar,
      }}
    >
      {children}
    </ChargingFormContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useChargingForm(): ChargingFormContextType {
  const context = useContext(ChargingFormContext);
  if (!context) {
    throw new Error('useChargingForm must be used within a ChargingFormProvider');
  }
  return context;
}
