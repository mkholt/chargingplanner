import { useMemo } from 'react';

import {
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CalendarClock24Regular,
  Clock16Regular,
  Flash16Regular,
  Money16Regular,
  Play16Regular,
  Stop16Regular,
} from '@fluentui/react-icons';

import { PriceTimeline } from '@/components';
import { usePriceSettings } from '@/contexts';
import type { PricesApiResponse } from '@/types';
import {
  buildTimeline,
  findOptimalChargingWindow,
  MS_PER_MINUTE,
  type ChargingResult,
  type PriceSlot,
} from '@/utils';

type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

type Props = {
  formInput: FormInput | null;
  priceData: PricesApiResponse | undefined;
};

type CalculationResults = {
  result: ChargingResult | null;
  slots: PriceSlot[];
  intervalStart: Date | null;
  intervalMinutes: number;
  chargingSpeed: number | undefined;
};

function calculateResults(
  input: FormInput | null,
  priceData: PricesApiResponse | undefined
): CalculationResults {
  const emptyResults: CalculationResults = {
    result: null,
    slots: [],
    intervalStart: null,
    intervalMinutes: 60,
    chargingSpeed: undefined,
  };

  if (!input || !priceData) {
    return emptyResults;
  }

  const earliestDate = new Date(input.earliest);
  const latestDate = new Date(input.latest);

  // Build timeline of prices from now to end of available data
  // Resolution is determined by the API response (based on aggregation param we sent)
  const timeline = buildTimeline(earliestDate, latestDate, priceData);
  if (!timeline) {
    return { ...emptyResults, chargingSpeed: input.chargingSpeed };
  }

  // Validate interval duration using the timeline's interval size
  const msPerInterval = timeline.intervalMinutes * MS_PER_MINUTE;
  const intervalCount = Math.floor((latestDate.getTime() - earliestDate.getTime()) / msPerInterval) + 1;
  if (intervalCount <= 0) {
    return { ...emptyResults, chargingSpeed: input.chargingSpeed };
  }

  // Extract prices for the charging interval only (for optimization calculation)
  const chargingIntervalPrices = timeline.slots
    .slice(timeline.chargingStartIdx, timeline.chargingEndIdx)
    .map(slot => slot.total);

  // Find optimal charging window
  const calcResult = findOptimalChargingWindow({
    startPercent: input.startPercent,
    endPercent: input.endPercent,
    batterySize: input.batterySize,
    chargingSpeed: input.chargingSpeed,
    prices: chargingIntervalPrices,
    intervalMinutes: timeline.intervalMinutes,
  });

  // Adjust result indices to be relative to the full timeline
  const adjustedResult = calcResult
    ? {
        ...calcResult,
        startIndex: calcResult.startIndex + timeline.chargingStartIdx,
        endIndex: calcResult.endIndex + timeline.chargingStartIdx,
      }
    : null;

  return {
    result: adjustedResult,
    slots: timeline.slots,
    intervalStart: timeline.startDate,
    intervalMinutes: timeline.intervalMinutes,
    chargingSpeed: input.chargingSpeed,
  };
}

/** Format duration as "Xh Ym" */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const Results: React.FC<Props> = ({
  formInput,
  priceData,
}) => {
  const { resolved: priceSettings } = usePriceSettings();

  // Calculate results from raw inputs
  const { result, slots, intervalStart, intervalMinutes, chargingSpeed } = useMemo(
    () => calculateResults(formInput, priceData),
    [formInput, priceData]
  );

  const bg = tokens.colorNeutralBackground2;
  const border = tokens.colorNeutralStroke1;
  const text = tokens.colorNeutralForeground1;
  const brand = tokens.colorBrandForeground1;
  const secondary = tokens.colorNeutralForeground2;

  // Build price source description
  const priceSource = (() => {
    const { company, product, supplier, priceArea, priceAreaSource } = priceSettings;

    if (company && product) {
      // Full product selection: "Company - Product"
      return `${company.name} - ${product.name}`;
    }
    if (supplier) {
      // Supplier selected but no company: show supplier and area
      return `${supplier.name} (${priceArea})`;
    }
    // Manual price area selection
    return priceAreaSource === 'manual'
      ? `Spot price ${priceArea}`
      : `${priceArea}`;
  })();

  if (!slots.length || !intervalStart) {
    return (
      <Card>
        <Text>No result to display.</Text>
      </Card>
    );
  }

  // Filter out slots before the current interval
  const now = new Date();
  const currentIntervalStart = new Date(now);
  // Round down to the start of the current interval
  const currentMinutes = currentIntervalStart.getMinutes();
  currentIntervalStart.setMinutes(Math.floor(currentMinutes / intervalMinutes) * intervalMinutes, 0, 0);

  let firstIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    const intervalDate = new Date(intervalStart);
    intervalDate.setMinutes(intervalDate.getMinutes() + i * intervalMinutes, 0, 0);
    if (intervalDate >= currentIntervalStart) {
      firstIdx = i;
      break;
    }
  }
  const filteredSlots = slots.slice(firstIdx);
  const filteredStart = new Date(intervalStart);
  filteredStart.setMinutes(filteredStart.getMinutes() + firstIdx * intervalMinutes, 0, 0);

  // Highlight charging window (adjusted for filtered index)
  let highlightStart = result ? result.startIndex - firstIdx : -1;
  let highlightEnd = result ? result.endIndex - firstIdx : -1;
  if (highlightStart < 0 || highlightStart >= filteredSlots.length) highlightStart = -1;
  if (highlightEnd < 0 || highlightEnd > filteredSlots.length) highlightEnd = filteredSlots.length;

  return (
    <Card style={{
      padding: 16,
      background: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CalendarClock24Regular />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text weight="semibold" size={400} style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
            Charging Plan
          </Text>
          <Text size={200} style={{ color: secondary }}>
            {priceSource}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Play16Regular />
              <Text size={200} style={{ color: secondary }}>Start</Text>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(() => {
                const startDate = new Date(filteredStart);
                startDate.setMinutes(startDate.getMinutes() + highlightStart * intervalMinutes, 0, 0);
                return startDate.toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                });
              })()}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Stop16Regular />
              <Text size={200} style={{ color: secondary }}>End</Text>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(() => {
                const endDate = new Date(filteredStart);
                endDate.setMinutes(endDate.getMinutes() + highlightEnd * intervalMinutes, 0, 0);
                return endDate.toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                });
              })()}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Clock16Regular />
              <Text size={200} style={{ color: secondary }}>Duration</Text>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {formatDuration(result.durationHours)}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: secondary }}>
              <Flash16Regular />
              <Text size={200} style={{ color: secondary }}>Energy</Text>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {result.energyNeeded.toFixed(1)} kWh
            </div>
          </div>
          <div>
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
      <PriceTimeline
        slots={filteredSlots}
        startDate={filteredStart}
        chargingStart={highlightStart}
        chargingEnd={highlightEnd}
        chargingSpeed={chargingSpeed}
        totalCost={result?.totalCost}
        durationHours={result?.durationHours}
        intervalMinutes={intervalMinutes}
      />
    </Card>
  );
};
