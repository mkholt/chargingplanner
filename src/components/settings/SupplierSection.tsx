import React, { useState } from 'react';

import {
  Dropdown,
  Input,
  Option,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Location20Regular, Building20Regular } from '@fluentui/react-icons';

import { usePriceSettings } from '@/contexts';
import { isValidPostalCode } from '@/data';

export const SupplierSection: React.FC = () => {
  const { resolved, setPostalCode, setSupplierId } = usePriceSettings();
  const { postalCode, availableSuppliers, supplier, isLoading } = resolved;

  const [inputValue, setInputValue] = useState(postalCode?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);

    if (!value.trim()) {
      setPostalCode(null);
      return;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      setError('Enter a valid number');
      return;
    }

    if (!isValidPostalCode(parsed)) {
      setError('Danish postal codes are 1000-9999');
      return;
    }

    setPostalCode(parsed);
  };

  const showSupplierDropdown = availableSuppliers.length > 1;
  const supplierDisplayValue = supplier?.name ?? 'Select grid operator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Grid Operator (Netselskab)</Text>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Location20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Input
          value={inputValue}
          onChange={(_, data) => handleInputChange(data.value)}
          placeholder="Enter postal code (e.g., 2100)"
          type="number"
          min={1000}
          max={9999}
          style={{ flex: 1 }}
        />
      </div>

      {error && (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
          {error}
        </Text>
      )}

      {isLoading && postalCode && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size="tiny" />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Looking up grid operators...
          </Text>
        </div>
      )}

      {/* Multiple suppliers - show dropdown with prompt */}
      {!isLoading && showSupplierDropdown && (
        <>
          <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
            Multiple grid operators serve this area. Please select one:
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
            <Dropdown
              value={supplierDisplayValue}
              onOptionSelect={(_, data) => {
                setSupplierId(data.optionValue ?? null);
              }}
              placeholder="Select grid operator"
              style={{ flex: 1 }}
            >
              {availableSuppliers.map(s => (
                <Option key={s.id} value={s.id} text={s.name}>
                  <div>
                    <div>{s.name}</div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {s.companyName}
                    </Text>
                  </div>
                </Option>
              ))}
            </Dropdown>
          </div>
        </>
      )}

      {/* Single supplier auto-selected - show info card */}
      {!isLoading && !showSupplierDropdown && supplier && (
        <div
          style={{
            padding: 12,
            background: tokens.colorNeutralBackground3,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            borderRadius: 8,
          }}
        >
          <Text weight="semibold" style={{ display: 'block' }}>
            {supplier.name}
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {supplier.companyName} · {supplier.priceArea === 'DK1' ? 'Vestdanmark' : 'Østdanmark'}
          </Text>
        </div>
      )}

      {/* No suppliers found */}
      {!isLoading && postalCode && !error && availableSuppliers.length === 0 && (
        <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
          No grid operator found for postal code {postalCode}
        </Text>
      )}
    </div>
  );
};
