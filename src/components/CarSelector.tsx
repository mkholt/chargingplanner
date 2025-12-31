import React from 'react';

import {
  Button,
  Dropdown,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { VehicleCar20Regular } from '@fluentui/react-icons';

import { useCars } from '@/contexts';

type Props = {
  onAddCarClick?: () => void;
};

export const CarSelector: React.FC<Props> = ({ onAddCarClick }) => {
  const { cars, selectedCarId, setSelectedCarId } = useCars();
  const selectedCar = cars.find(c => c.id === selectedCarId);

  if (cars.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: tokens.colorNeutralBackground3,
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VehicleCar20Regular style={{ color: tokens.colorNeutralForeground3 }} />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="no-car-message">
            No car saved
          </Text>
        </div>
        <Button
          appearance="primary"
          size="small"
          onClick={onAddCarClick}
          data-testid="add-car-button"
        >
          Add Car
        </Button>
      </div>
    );
  }

  const displayValue = selectedCar
    ? `${selectedCar.name} · ${selectedCar.batterySize} kWh · ${selectedCar.maxPower} kW`
    : 'Select car';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}
    >
      <VehicleCar20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
      <Dropdown
        data-testid="car-selector"
        value={displayValue}
        onOptionSelect={(_ev, data) => {
          if (data.optionValue) {
            setSelectedCarId(data.optionValue);
          }
        }}
        style={{ flex: 1, minWidth: 0 }}
      >
        {cars.map(car => (
          <Option key={car.id} value={car.id} text={car.name}>
            <div>
              <div>{car.name}</div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {car.batterySize} kWh · {car.maxPower} kW
              </Text>
            </div>
          </Option>
        ))}
      </Dropdown>
    </div>
  );
};
