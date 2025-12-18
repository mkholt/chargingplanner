import React from 'react';

import {
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';

type Props = {
  result: {
    startHour: number;
    endHour: number;
    totalCost: number;
    duration: number;
    windowPrices: number[];
  } | null;
  date: string; // interval label
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
  const highlightBg = tokens.colorBrandBackground2;
  const highlightBorder = tokens.colorBrandStroke1;
  const text = tokens.colorNeutralForeground1;
  const subText = tokens.colorNeutralForeground3;
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
      <div style={{ marginTop: 12 }}>
        <Text size={300}>Hourly prices timeline:</Text>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            borderLeft: `3px solid ${border}`,
            marginLeft: 24,
            marginTop: 8,
          }}
        >
          {filteredPrices.map((p, i) => {
            const hourDate = new Date(filteredStart);
            hourDate.setHours(hourDate.getHours() + i, 0, 0, 0);
            const label = hourDate.toLocaleString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            });
            const isActive =
              result && i >= highlightStart && i < highlightEnd;
            const total =
              chargingSpeed !== undefined
                ? Math.round(p * chargingSpeed * 100) / 100
                : undefined;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: isActive ? highlightBg : 'transparent',
                  borderLeft: isActive
                    ? `3px solid ${highlightBorder}`
                    : `3px solid ${border}`,
                  padding: '4px 0 4px 12px',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 15,
                  minHeight: 32,
                  position: 'relative',
                  color: text,
                }}
              >
                <span style={{ width: 90, color: subText, fontSize: 13 }}>{label}</span>
                <span style={{ marginLeft: 16, minWidth: 90 }}>
                  {p} DKK/kWh
                </span>
                <span style={{ marginLeft: 16, minWidth: 110, color: subText, fontSize: 13 }}>
                  {chargingSpeed !== undefined
                    ? `Total: ${total} DKK @ ${chargingSpeed.toFixed(1)} kW`
                    : ''}
                </span>
                {isActive && (
                  <span
                    style={{
                      marginLeft: 12,
                      color: brand,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Charging
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
