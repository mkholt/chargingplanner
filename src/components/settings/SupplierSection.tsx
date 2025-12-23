import React, { useState } from 'react';

import {
  Input,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Location20Regular } from '@fluentui/react-icons';

import type { Supplier } from '@/utils';
import { isValidPostalCode } from '@/utils';

type Props = {
  postalCode: number | null;
  supplier: Supplier | null;
  onPostalCodeChange: (postalCode: number | null) => void;
};

export const SupplierSection: React.FC<Props> = ({
  postalCode,
  supplier,
  onPostalCodeChange,
}) => {
  const [inputValue, setInputValue] = useState(postalCode?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);

    if (!value.trim()) {
      onPostalCodeChange(null);
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

    onPostalCodeChange(parsed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Supplier (Netselskab)</Text>

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

      {supplier ? (
        <div
          style={{
            padding: 12,
            background: tokens.colorNeutralBackground3,
            borderRadius: 6,
          }}
        >
          <Text weight="semibold" style={{ display: 'block' }}>
            {supplier.name}
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {supplier.companyName} · {supplier.priceArea === 'DK1' ? 'Vestdanmark' : 'Østdanmark'}
          </Text>
        </div>
      ) : postalCode && !error ? (
        <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
          No supplier found for postal code {postalCode}
        </Text>
      ) : null}
    </div>
  );
};
