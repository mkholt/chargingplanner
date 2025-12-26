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

type Props = {
  result: {
    startIndex: number;
    endIndex: number;
    intervalMinutes: number;
    totalCost: number;
    durationHours: number;
    windowPrices: number[];
    energyNeeded: number;
  } | null;
  date: string;
  intervalPrices: number[];
  intervalStart: Date | null;
  intervalMinutes: number;
  chargingSpeed?: number;
};

/** Format duration as "Xh Ym" */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const Results: React.FC<Props> = ({
  result,
  intervalPrices,
  intervalStart,
  intervalMinutes,
  chargingSpeed,
}) => {
  const bg = tokens.colorNeutralBackground2;
  const border = tokens.colorNeutralStroke1;
  const text = tokens.colorNeutralForeground1;
  const brand = tokens.colorBrandForeground1;
  const secondary = tokens.colorNeutralForeground2;

  if (!intervalPrices.length || !intervalStart) {
    return (
      <Card>
        <Text>No result to display.</Text>
      </Card>
    );
  }

  // Filter out prices before the current interval
  const now = new Date();
  const currentIntervalStart = new Date(now);
  // Round down to the start of the current interval
  const currentMinutes = currentIntervalStart.getMinutes();
  currentIntervalStart.setMinutes(Math.floor(currentMinutes / intervalMinutes) * intervalMinutes, 0, 0);

  let firstIdx = 0;
  for (let i = 0; i < intervalPrices.length; i++) {
    const intervalDate = new Date(intervalStart);
    intervalDate.setMinutes(intervalDate.getMinutes() + i * intervalMinutes, 0, 0);
    if (intervalDate >= currentIntervalStart) {
      firstIdx = i;
      break;
    }
  }
  const filteredPrices = intervalPrices.slice(firstIdx);
  const filteredStart = new Date(intervalStart);
  filteredStart.setMinutes(filteredStart.getMinutes() + firstIdx * intervalMinutes, 0, 0);

  // Highlight charging window (adjusted for filtered index)
  let highlightStart = result ? result.startIndex - firstIdx : -1;
  let highlightEnd = result ? result.endIndex - firstIdx : -1;
  if (highlightStart < 0 || highlightStart >= filteredPrices.length) highlightStart = -1;
  if (highlightEnd < 0 || highlightEnd > filteredPrices.length) highlightEnd = filteredPrices.length;

  return (
    <Card style={{
      padding: 16,
      background: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CalendarClock24Regular />
        <Text weight="semibold" size={400} style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
          Charging Plan
        </Text>
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
        prices={filteredPrices}
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
