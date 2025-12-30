import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

import type { HourData } from './types';

type Props = {
  hour: HourData;
  color: string;
  chargingSpeed?: number;
  intervalMinutes: number;
};

type BreakdownItem = {
  label: string;
  value: number;
  unit?: string;
};

function getBreakdownItems(details: NonNullable<HourData['details']>): BreakdownItem[] {
  const items: BreakdownItem[] = [];

  if (details.electricity?.total !== undefined) {
    items.push({ label: 'Spot price', value: details.electricity.total, unit: 'kr/kWh' });
  }

  if (details.surcharge?.total !== undefined) {
    items.push({ label: 'Supplier', value: details.surcharge.total, unit: 'kr/kWh' });
  }

  // Combine transmission tariffs
  const transmissionTotal =
    (details.transmission?.systemTariff?.total ?? 0) +
    (details.transmission?.netTariff?.total ?? 0);
  if (transmissionTotal > 0) {
    items.push({ label: 'Transmission', value: transmissionTotal, unit: 'kr/kWh' });
  }

  if (details.distribution?.total !== undefined) {
    items.push({ label: 'Distribution', value: details.distribution.total, unit: 'kr/kWh' });
  }

  if (details.electricityTax?.total !== undefined) {
    items.push({ label: 'Tax', value: details.electricityTax.total, unit: 'kr/kWh' });
  }

  return items;
}

export const SelectedHourDetail: React.FC<Props> = ({
  hour,
  color,
  chargingSpeed,
  intervalMinutes,
}) => {
  const endDate = new Date(hour.date.getTime() + intervalMinutes * 60 * 1000);
  const durationLabel = intervalMinutes === 60 ? '1 hour' : `${intervalMinutes} min`;

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
        marginTop: 8,
        padding: 12,
        background: tokens.colorNeutralBackground3,
        borderRadius: 8,
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
            marginTop: 12,
            paddingTop: 8,
            borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
            gap: 8,
          }}
        >
          {breakdownItems.map((item) => (
            <div key={item.label}>
              <Text size={100} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                {item.label}
              </Text>
              <Text size={200} weight="medium">
                {item.value.toFixed(2)}
                {item.unit && (
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3, marginLeft: 2 }}>
                    {item.unit}
                  </Text>
                )}
              </Text>
            </div>
          ))}
        </div>
      )}

      {chargingSpeed !== undefined && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${tokens.colorNeutralStroke1}` }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            Cost for {durationLabel} @ {chargingSpeed} kW:{' '}
            <Text weight="semibold">
              {(hour.price * chargingSpeed * (intervalMinutes / 60)).toFixed(2)} DKK
            </Text>
          </Text>
          {isPartialBar && chargingSpeed !== undefined && (
            <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: 4 }}>
              Charging portion ({Math.round(actualChargingMinutes)} min):{' '}
              <Text weight="semibold">
                {(hour.price * chargingSpeed * (actualChargingMinutes / 60)).toFixed(2)} DKK
              </Text>
            </Text>
          )}
        </div>
      )}

      {hour.isCharging && (
        <div
          style={{
            marginTop: 8,
            padding: '4px 8px',
            background: tokens.colorBrandBackground2,
            borderRadius: 4,
            display: 'inline-block',
          }}
        >
          <Text size={200} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
            {isPartialBar
              ? `Charging ${chargingStartDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${chargingEndDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
              : 'Charging'}
          </Text>
        </div>
      )}
    </div>
  );
};
