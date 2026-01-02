import React, { useState } from 'react';

import {
  Button,
  Input,
  Spinner,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { MyLocation16Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SelectionCard } from '@/components/settings';
import { isCoordinates, isPostalCode, usePriceSettings } from '@/contexts';
import { isValidPostalCode } from '@/data';

export const SupplierSection: React.FC = () => {
  const { t } = useTranslation();
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
      setError(t('supplier.invalidNumber'));
      return;
    }

    if (!isValidPostalCode(parsed)) {
      setError(t('supplier.postalCodeRange'));
      return;
    }

    setLocation(parsed);
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      setLocationError(t('supplier.geolocationNotSupported'));
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
            setLocationError(t('supplier.locationDenied'));
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError(t('supplier.locationUnavailable'));
            break;
          case err.TIMEOUT:
            setLocationError(t('supplier.locationTimeout'));
            break;
          default:
            setLocationError(t('supplier.unknownError'));
        }
      },
      { enableHighAccuracy: false, timeout: 20000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM }}>
      <Text weight="semibold">{t('supplier.title')}</Text>

      <Input
        value={inputValue}
        onChange={(_, data) => handleInputChange(data.value)}
        placeholder={t('supplier.placeholder')}
        type="number"
        min={1000}
        max={9999}
        data-testid="postal-code-input"
        contentAfter={
          <Tooltip content={t('supplier.useMyLocation')} relationship="label">
            <Button
              size="small"
              appearance="transparent"
              icon={isLocating ? <Spinner size="tiny" /> : <MyLocation16Regular />}
              onClick={handleGpsClick}
              disabled={isLocating}
              aria-label={t('supplier.useMyLocation')}
              data-testid="gps-location-button"
            />
          </Tooltip>
        }
      />

      {error && (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="postal-code-error">
          {error}
        </Text>
      )}

      {locationError && (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="location-error">
          {locationError}
        </Text>
      )}

      {isUsingGps && !isLoadingSuppliers && (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="gps-location-indicator">
          {t('supplier.usingGps')}
        </Text>
      )}

      {isLoadingSuppliers && location !== null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
          <Spinner size="tiny" />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {t('supplier.lookingUp')}
          </Text>
        </div>
      )}

      {/* Supplier cards */}
      {!isLoadingSuppliers && displayedSuppliers.length > 0 && (
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
          {displayedSuppliers.map(s => (
            <SelectionCard
              key={s.id}
              title={s.name}
              subtitle={`${s.companyName} · ${s.priceArea === 'DK1' ? t('supplier.westDenmark') : t('supplier.eastDenmark')}`}
              isSelected={supplier?.id === s.id}
              onClick={() => setSupplier(s)}
            />
          ))}
        </div>
      )}

      {/* No suppliers found */}
      {!isLoadingSuppliers && location !== null && !error && !locationError && displayedSuppliers.length === 0 && (
        <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }} data-testid="no-supplier-message">
          {postalCode ? t('supplier.notFoundForPostal', { code: postalCode }) : t('supplier.notFoundAtLocation')}
        </Text>
      )}
    </div>
  );
};
