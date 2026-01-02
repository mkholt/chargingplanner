import React from 'react';

import {
  Button,
  Dropdown,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { useCars, useSettingsUI } from '@/contexts';

export const CarSelector: React.FC = () => {
  const { openSettings } = useSettingsUI();
  const { t } = useTranslation();
  const { cars, selectedCar, setSelectedCarId } = useCars();

  if (cars.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacingHorizontalS} ${tokens.spacingHorizontalM}`,
          background: tokens.colorNeutralBackground3,
          borderRadius: tokens.borderRadiusLarge,
          marginBottom: tokens.spacingHorizontalL,
        }}
      >
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="no-car-message">
          {t('cars.noCarSaved')}
        </Text>
        <Button
          appearance="primary"
          size="small"
          onClick={() => openSettings('cars')}
          data-testid="add-car-button"
        >
          {t('cars.addCar')}
        </Button>
      </div>
    );
  }

  const displayValue = selectedCar
    ? `${selectedCar.name} · ${selectedCar.batterySize} kWh · ${selectedCar.maxPower} kW`
    : t('cars.selectCar');

  return (
    <div
      style={{
        marginBottom: tokens.spacingHorizontalL,
      }}
    >
      <Dropdown
        data-testid="car-selector"
        value={displayValue}
        onOptionSelect={(_ev, data) => {
          if (data.optionValue) {
            setSelectedCarId(data.optionValue);
          }
        }}
        style={{ width: '100%' }}
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
