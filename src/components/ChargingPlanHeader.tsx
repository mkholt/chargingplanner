import React from 'react';

import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CalendarClock24Regular,
  Clock16Regular,
  Flash16Regular,
  Info12Regular,
  Money16Regular,
  Play16Regular,
  Stop16Regular,
} from '@fluentui/react-icons';

import { useCars, usePriceSettings } from '@/contexts';
import { CHARGING_EFFICIENCY, type ChargingResult } from '@/utils';

type Props = {
  result: ChargingResult | null;
  /** Start date for calculating display times */
  startDate: Date;
  /** Highlight start index (for time calculation) */
  highlightStart: number;
  /** Highlight end index (for time calculation) */
  highlightEnd: number;
  /** Interval size in minutes */
  intervalMinutes: number;
  /** Fraction of first interval that's unavailable (0-1), for partial start blocks */
  startOffset?: number;
  /** The original slot index where user's earliest time falls (in the full timeline, before filtering) */
  chargingStartIdx?: number;
  /** The first visible slot index after filtering (to determine when startOffset applies) */
  firstVisibleIdx?: number;
};

/** Format duration as "Xh Ym" */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const ChargingPlanHeader: React.FC<Props> = ({
  result,
  startDate,
  highlightStart,
  highlightEnd,
  intervalMinutes,
  startOffset = 0,
  chargingStartIdx = 0,
  firstVisibleIdx = 0,
}) => {
  const { cars, selectedCarId } = useCars();
  const { resolved: priceSettings } = usePriceSettings();

  const secondary = tokens.colorNeutralForeground2;
  const bg = tokens.colorNeutralBackground2;
  const border = tokens.colorNeutralStroke1;
  const text = tokens.colorNeutralForeground1;
  const brand = tokens.colorBrandForeground1;

  // Get selected car name
  const selectedCar = cars.find(c => c.id === selectedCarId);

  // Build price source description
  const priceSource = (() => {
    const { company, product, supplier, priceArea, priceAreaSource } = priceSettings;

    if (company && product) {
      return `${company.name} - ${product.name}`;
    }
    if (supplier) {
      return `${supplier.name} (${priceArea})`;
    }
    return priceAreaSource === 'manual'
      ? `Spot price ${priceArea}`
      : `${priceArea}`;
  })();

  // Build subtitle with car name and price source
  const subtitle = selectedCar
    ? `${selectedCar.name} · ${priceSource}`
    : priceSource;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CalendarClock24Regular />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text weight="semibold" size={400} style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
            Charging Plan
          </Text>
          <Text size={200} style={{ color: secondary }}>
            {subtitle}
          </Text>
        </div>
      </div>
      {result && (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: 12,
            background: bg,
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: tokens.shadow2,
            border: `1px solid ${border}`,
            color: text,
          }}
        >
          <div data-testid="result-start">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Play16Regular />
              <Text size={200} style={{ color: secondary }}>Start</Text>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(() => {
                const date = new Date(startDate);
                // Apply startOffset only when charging starts at user's earliest time slot
                const actualStartIdx = highlightStart + firstVisibleIdx;
                const startsAtEarliestSlot = actualStartIdx === chargingStartIdx;
                const offsetMinutes = startsAtEarliestSlot ? startOffset * intervalMinutes : 0;
                date.setMinutes(date.getMinutes() + highlightStart * intervalMinutes + offsetMinutes, 0, 0);
                return date.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
              })()}
            </div>
          </div>
          <div data-testid="result-end">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Stop16Regular />
              <Text size={200} style={{ color: secondary }}>End</Text>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(() => {
                const date = new Date(startDate);
                // Subtract endOffset from the end time (endOffset is the unused portion of last interval)
                const endOffsetMinutes = result.endOffset * intervalMinutes;
                date.setMinutes(date.getMinutes() + highlightEnd * intervalMinutes - endOffsetMinutes, 0, 0);
                return date.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
              })()}
            </div>
          </div>
          <div data-testid="result-duration">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Clock16Regular />
              <Text size={200} style={{ color: secondary }}>Duration</Text>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {formatDuration(result.durationHours)}
            </div>
          </div>
          <div data-testid="result-energy">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Flash16Regular />
              <Text size={200} style={{ color: secondary }}>Energy</Text>
            </div>
            <Popover withArrow openOnHover>
              <PopoverTrigger disableButtonEnhancement>
                <button
                  type="button"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'inherit',
                    font: 'inherit',
                  }}
                  aria-label="Energy breakdown"
                >
                  {result.energyNeeded.toFixed(1)} kWh
                  <Info12Regular style={{ color: secondary }} />
                </button>
              </PopoverTrigger>
              <PopoverSurface>
                <div>
                  <div>{(result.energyNeeded * CHARGING_EFFICIENCY).toFixed(1)} kWh to battery</div>
                  <div>+{((1 - CHARGING_EFFICIENCY) * 100).toFixed(0)}% charging loss</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>= {result.energyNeeded.toFixed(1)} kWh from grid</div>
                </div>
              </PopoverSurface>
            </Popover>
          </div>
          <div data-testid="result-cost">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Money16Regular />
              <Text size={200} style={{ color: secondary }}>Est. Cost</Text>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: brand }}>
              {result.totalCost} DKK
            </div>
          </div>
        </div>
      )}
    </>
  );
};
