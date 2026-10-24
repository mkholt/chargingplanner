import React from 'react';

import { Spinner, Text, tokens } from '@fluentui/react-components';
import { VehicleCar20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SkodaProxyError } from '@/api';
import { Stack } from '@/components/ui';
import { type Car, useSkodaProxy, useSkodaVault } from '@/contexts';
import { useSkodaVehicleQuery } from '@/hooks';

import { SkodaLinkStatusText } from './SkodaLinkStatusText';
import { SkodaUnlockForm } from './SkodaUnlockForm';

const containerStyle: React.CSSProperties = {
  padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
  borderRadius: tokens.borderRadiusMedium,
  background: tokens.colorNeutralBackground3,
  marginBottom: tokens.spacingVerticalM,
};

/** Live battery state of the selected car, shown above the charging inputs */
export const SkodaVehicleStatus: React.FC<{ car: Car | null }> = ({ car }) => {
  const { t } = useTranslation();
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, unlockSkipped, skipUnlock } = useSkodaVault();
  const { data, error, isLoading } = useSkodaVehicleQuery(car);

  if (!baseUrl || !car?.skoda) return null;

  const renderContent = () => {
    if (isProtected && !isUnlocked) {
      return unlockSkipped
        ? <SkodaLinkStatusText car={car} />
        : <SkodaUnlockForm prompt={t('skoda.vault.unlockPrompt', { name: car.name })} onSkip={skipUnlock} />;
    }
    if (isLoading) return <Spinner size="tiny" label={t('skoda.vehicle.loading')} labelPosition="after" />;
    if (error) {
      const relink = error instanceof SkodaProxyError && error.requiresRelink;
      return (
        <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="skoda-vehicle-error">
          {relink ? t('skoda.vehicle.relink') : t('skoda.vehicle.error')}
        </Text>
      );
    }
    const battery = data?.charging?.status?.battery;
    if (battery?.stateOfChargeInPercent === undefined) return <SkodaLinkStatusText car={car} />;

    const rangeMeters = battery.remainingCruisingRangeInMeters;
    const target = data?.charging?.settings?.targetStateOfChargeInPercent;
    return (
      <Stack horizontal gap={tokens.spacingHorizontalS} align="center" wrap>
        <VehicleCar20Regular />
        <Text size={200} weight="semibold" data-testid="skoda-vehicle-summary">
          {rangeMeters === undefined
            ? t('skoda.vehicle.summaryNoRange', { soc: battery.stateOfChargeInPercent })
            : t('skoda.vehicle.summary', { soc: battery.stateOfChargeInPercent, range: Math.round(rangeMeters / 1000) })}
        </Text>
        {target !== undefined && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="skoda-vehicle-charge-limit">
            · {t('skoda.vehicle.chargeLimit', { target })}
          </Text>
        )}
      </Stack>
    );
  };

  return (
    <div style={containerStyle} data-testid="skoda-vehicle-status">
      {renderContent()}
    </div>
  );
};
