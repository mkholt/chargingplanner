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
    startHour: number;
    endHour: number;
    totalCost: number;
    duration: number;
    windowPrices: number[];
    energyNeeded: number;
  } | null;
  date: string;
  intervalPrices: number[];
  intervalStart: Date | null;
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

  // Filter out prices before the current hour
  // Use start of current hour so partial hours are included
  const now = new Date();
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);

  let firstIdx = 0;
  for (let i = 0; i < intervalPrices.length; i++) {
    const hourDate = new Date(intervalStart);
    hourDate.setHours(hourDate.getHours() + i, 0, 0, 0);
    if (hourDate >= currentHourStart) {
      firstIdx = i;
      break;
    }
  }
  const filteredPrices = intervalPrices.slice(firstIdx);
  const filteredStart = new Date(intervalStart);
  filteredStart.setHours(filteredStart.getHours() + firstIdx, 0, 0, 0);

  // Highlight charging window (adjusted for filtered index)
  let highlightStart = result ? result.startHour - firstIdx : -1;
  let highlightEnd = result ? result.endHour - firstIdx : -1;
  if (highlightStart < 0 || highlightStart >= filteredPrices.length) highlightStart = -1;
  if (highlightEnd < 0 || highlightEnd > filteredPrices.length) highlightEnd = filteredPrices.length;

  return (
    <Card style={{
      padding: 16,
      background: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                startDate.setHours(startDate.getHours() + highlightStart, 0, 0, 0);
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
                endDate.setHours(endDate.getHours() + highlightEnd, 0, 0, 0);
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
              {formatDuration(result.duration)}
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
        duration={result?.duration}
      />
    </Card>
  );
};
