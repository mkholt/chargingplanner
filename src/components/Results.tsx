import {
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';

import { PriceClock } from './PriceClock';

type Props = {
  result: {
    startHour: number;
    endHour: number;
    totalCost: number;
    duration: number;
    windowPrices: number[];
  } | null;
  date: string;
  intervalPrices: number[];
  intervalStart: Date | null;
  chargingSpeed?: number;
};

export const Results: React.FC<Props> = ({
  result,
  date,
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

  // Filter out prices before now
  const now = new Date();
  let firstIdx = 0;
  for (let i = 0; i < intervalPrices.length; i++) {
    const hourDate = new Date(intervalStart);
    hourDate.setHours(hourDate.getHours() + i, 0, 0, 0);
    if (hourDate >= now) {
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
    <Card>
      <Text weight="semibold" size={500}>
        Charging Plan ({date})
      </Text>
      {result && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'row',
            gap: 32,
            alignItems: 'center',
            background: bg,
            borderRadius: 8,
            padding: '16px 24px',
            boxShadow: tokens.shadow2,
            border: `1px solid ${border}`,
            color: text,
          }}
        >
          <div>
            <Text size={300} style={{ color: secondary }}>
              Start time
            </Text>
            <div>
              <b>
                {(() => {
                  const startDate = new Date(filteredStart);
                  startDate.setHours(startDate.getHours() + highlightStart, 0, 0, 0);
                  return startDate.toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  });
                })()}
              </b>
            </div>
          </div>
          <div>
            <Text size={300} style={{ color: secondary }}>
              End time
            </Text>
            <div>
              <b>
                {(() => {
                  const endDate = new Date(filteredStart);
                  endDate.setHours(endDate.getHours() + highlightEnd, 0, 0, 0);
                  return endDate.toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  });
                })()}
              </b>
            </div>
          </div>
          <div>
            <Text size={300} style={{ color: secondary }}>
              Duration
            </Text>
            <div>
              <b>{result.duration} hours</b>
            </div>
          </div>
          <div>
            <Text size={300} style={{ color: secondary }}>
              Total Cost
            </Text>
            <div>
              <b style={{ fontSize: 20, color: brand }}>{result.totalCost} DKK</b>
            </div>
          </div>
        </div>
      )}
      <PriceClock
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
