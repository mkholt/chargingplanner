import React, { useState } from 'react';

import {
  Button,
  Input,
  Spinner,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { Location20Regular, MyLocation20Regular } from '@fluentui/react-icons';

import { SelectionCard } from '@/components/settings';
import { isCoordinates, isPostalCode, usePriceSettings } from '@/contexts';
import { isValidPostalCode } from '@/data';

export const SupplierSection: React.FC = () => {
  const { resolved, setLocation, setSupplier } = usePriceSettings();
  const { location, availableSuppliers, supplier, isLoading } = resolved;

  // Extract postal code from location for display in input
  const postalCode = isPostalCode(location) ? location : null;
  const isUsingGps = isCoordinates(location);

  const [inputValue, setInputValue] = useState(postalCode?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Suppliers are resolved in context based on location
  // If no location is set but we have a saved supplier, show that supplier
  const displayedSuppliers = availableSuppliers.length > 0
    ? availableSuppliers
    : supplier ? [supplier] : [];
  const isLoadingSuppliers = isLoading;

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);
    setLocationError(null);

    if (!value.trim()) {
      setLocation(null);
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

    setLocation(parsed);
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setError(null);
    setInputValue(''); // Clear postal code input

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location access was denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('An unknown error occurred');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

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
        <Tooltip content="Use my location" relationship="label">
          <Button
            data-testid="gps-location-button"
            icon={isLocating ? <Spinner size="tiny" /> : <MyLocation20Regular />}
            appearance="subtle"
            onClick={handleGpsClick}
            disabled={isLocating}
            aria-label="Use my location"
          />
        </Tooltip>
      </div>

      {error && (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
          {error}
        </Text>
      )}

      {locationError && (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
          {locationError}
        </Text>
      )}

      {isUsingGps && !isLoadingSuppliers && (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Using GPS location
        </Text>
      )}

      {isLoadingSuppliers && location !== null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size="tiny" />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Looking up grid operators...
          </Text>
        </div>
      )}

      {/* Supplier cards */}
      {!isLoadingSuppliers && displayedSuppliers.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {displayedSuppliers.map(s => (
            <SelectionCard
              key={s.id}
              title={s.name}
              subtitle={`${s.companyName} · ${s.priceArea === 'DK1' ? 'Vestdanmark' : 'Østdanmark'}`}
              isSelected={supplier?.id === s.id}
              onClick={() => setSupplier(s)}
            />
          ))}
        </div>
      )}

      {/* No suppliers found */}
      {!isLoadingSuppliers && location !== null && !error && !locationError && displayedSuppliers.length === 0 && (
        <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
          No grid operator found {postalCode ? `for postal code ${postalCode}` : 'at your location'}
        </Text>
      )}
    </div>
  );
};
