
import { renderHook, act } from '@testing-library/react';
import { ChargingFormProvider, useChargingForm } from '@/contexts/ChargingFormContext';

describe('ChargingFormContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ChargingFormProvider>{children}</ChargingFormProvider>
  );

  describe('initial state', () => {
    it('starts with default battery size of 60 kWh', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });
      expect(result.current.batterySize).toBe(60);
    });

    it('starts with default charging speed of 11 kW', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });
      expect(result.current.chargingSpeed).toBe(11);
    });
  });

  describe('setBatterySize', () => {
    it('updates battery size', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });

      act(() => {
        result.current.setBatterySize(75);
      });

      expect(result.current.batterySize).toBe(75);
    });
  });

  describe('setChargingSpeed', () => {
    it('updates charging speed', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });

      act(() => {
        result.current.setChargingSpeed(22);
      });

      expect(result.current.chargingSpeed).toBe(22);
    });
  });

  describe('syncWithCar', () => {
    it('syncs battery size from car', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });

      act(() => {
        result.current.syncWithCar(77, 150);
      });

      expect(result.current.batterySize).toBe(77);
    });

    it('caps charging speed at car max power when current speed exceeds it', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });

      // Set charging speed higher than car's max power
      act(() => {
        result.current.setChargingSpeed(22);
      });

      // Sync with a car that has lower max power
      act(() => {
        result.current.syncWithCar(50, 7); // 7kW max
      });

      expect(result.current.chargingSpeed).toBe(7);
    });

    it('keeps charging speed when it does not exceed car max power', () => {
      const { result } = renderHook(() => useChargingForm(), { wrapper });

      // Set charging speed lower than car's max power
      act(() => {
        result.current.setChargingSpeed(11);
      });

      // Sync with a car that has higher max power
      act(() => {
        result.current.syncWithCar(100, 250); // 250kW max
      });

      expect(result.current.chargingSpeed).toBe(11);
    });
  });

  describe('error handling', () => {
    it('throws error when useChargingForm is used outside provider', () => {
      expect(() => {
        renderHook(() => useChargingForm());
      }).toThrow('useChargingForm must be used within a ChargingFormProvider');
    });
  });
});
