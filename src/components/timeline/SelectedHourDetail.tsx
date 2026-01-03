import React from 'react';

import { Text, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import type { HourData } from './types';

type Props = {
  hour: HourData;
  color: string;
  chargingSpeed?: number;
  intervalMinutes: number;
};

type BreakdownItem = {
  labelKey: 'selectedHour.spotPrice' | 'selectedHour.supplierSurcharge' | 'selectedHour.transmission' | 'selectedHour.distribution' | 'selectedHour.tax';
  value: number;
  unit?: string;
};

function getBreakdownItems(details: NonNullable<HourData['details']>): BreakdownItem[] {
  const items: BreakdownItem[] = [];

  if (details.electricity?.total !== undefined) {
    items.push({ labelKey: 'selectedHour.spotPrice', value: details.electricity.total, unit: 'kr/kWh' });
  }

  if (details.surcharge?.total !== undefined) {
    items.push({ labelKey: 'selectedHour.supplierSurcharge', value: details.surcharge.total, unit: 'kr/kWh' });
  }

  // Combine transmission tariffs
  const transmissionTotal =
    (details.transmission?.systemTariff?.total ?? 0) +
    (details.transmission?.netTariff?.total ?? 0);
  if (transmissionTotal > 0) {
    items.push({ labelKey: 'selectedHour.transmission', value: transmissionTotal, unit: 'kr/kWh' });
  }

  if (details.distribution?.total !== undefined) {
    items.push({ labelKey: 'selectedHour.distribution', value: details.distribution.total, unit: 'kr/kWh' });
  }

  if (details.electricityTax?.total !== undefined) {
    items.push({ labelKey: 'selectedHour.tax', value: details.electricityTax.total, unit: 'kr/kWh' });
  }

  return items;
}

export const SelectedHourDetail: React.FC<Props> = ({
  hour,
  color,
  chargingSpeed,
  intervalMinutes,
}) => {
  const { t } = useTranslation();
  const endDate = new Date(hour.date.getTime() + intervalMinutes * 60 * 1000);
  const durationLabel = intervalMinutes === 60
    ? t('selectedHour.oneHour')
    : t('selectedHour.minutes', { minutes: intervalMinutes });

  // Check if this is a partial charging bar
  const isPartialBar = hour.isCharging &&
    hour.chargingFillFraction !== undefined &&
    hour.chargingFillFraction < 1;
  const fillFraction = hour.chargingFillFraction ?? 1;
  const fillFromRight = hour.fillFromRight ?? false;

  // Calculate actual charging time for partial bars
  let chargingStartDate = hour.date;
  let chargingEndDate = endDate;

  if (isPartialBar) {
    const inactiveFraction = 1 - fillFraction;
    const inactiveMinutes = Math.round(inactiveFraction * intervalMinutes);

    if (fillFromRight) {
      // Charging starts partway through (inactive portion at start)
      chargingStartDate = new Date(hour.date.getTime() + inactiveMinutes * 60 * 1000);
    } else {
      // Charging ends partway through (inactive portion at end)
      chargingEndDate = new Date(hour.date.getTime() + fillFraction * intervalMinutes * 60 * 1000);
    }
  }

  // Calculate actual charging duration for cost calculation
  const actualChargingMinutes = isPartialBar
    ? fillFraction * intervalMinutes
    : intervalMinutes;

  const breakdownItems = hour.details ? getBreakdownItems(hour.details) : [];

  return (
    <div
      style={{
        marginTop: tokens.spacingHorizontalS,
        padding: tokens.spacingHorizontalM,
        background: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusLarge,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text weight="semibold" size={300}>
            {hour.date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' - '}
            {endDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
            {hour.dayLabel}
          </Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text weight="semibold" size={400} style={{ color }}>
            {hour.price.toFixed(2)}
          </Text>
          <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>
            DKK/kWh
          </Text>
        </div>
      </div>

      {/* Price breakdown */}
      {breakdownItems.length > 0 && (
        <div
          style={{
            marginTop: tokens.spacingHorizontalM,
            paddingTop: tokens.spacingHorizontalS,
            borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
            gap: tokens.spacingHorizontalS,
          }}
        >
          {breakdownItems.map((item) => (
            <div key={item.labelKey}>
              <Text size={100} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                {t(item.labelKey)}
              </Text>
              <Text size={200} weight="medium">
                {item.value.toFixed(2)}
                {item.unit && (
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3, marginLeft: tokens.spacingHorizontalXXS }}>
                    {item.unit}
                  </Text>
                )}
              </Text>
            </div>
          ))}
        </div>
      )}

      {chargingSpeed !== undefined && (
        <div style={{ marginTop: tokens.spacingHorizontalS, paddingTop: tokens.spacingHorizontalS, borderTop: `1px solid ${tokens.colorNeutralStroke1}` }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            {t('selectedHour.costFor', {
              duration: durationLabel,
              power: chargingSpeed,
              cost: (hour.price * chargingSpeed * (intervalMinutes / 60)).toFixed(2),
            })}
          </Text>
          {isPartialBar && chargingSpeed !== undefined && (
            <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: tokens.spacingHorizontalXS }}>
              {t('selectedHour.chargingPortion', {
                minutes: Math.round(actualChargingMinutes),
                cost: (hour.price * chargingSpeed * (actualChargingMinutes / 60)).toFixed(2),
              })}
            </Text>
          )}
        </div>
      )}

      {hour.isCharging && (
        <div
          style={{
            marginTop: tokens.spacingHorizontalS,
            padding: `${tokens.spacingHorizontalXS} ${tokens.spacingHorizontalS}`,
            background: tokens.colorBrandBackground2,
            borderRadius: tokens.borderRadiusMedium,
            display: 'inline-block',
          }}
        >
          <Text size={200} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
            {isPartialBar
              ? t('selectedHour.chargingRange', {
                  start: chargingStartDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                  end: chargingEndDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                })
              : t('selectedHour.charging')}
          </Text>
        </div>
      )}
    </div>
  );
};
