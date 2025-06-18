import React from 'react';

import {
  Card,
  Text,
} from '@fluentui/react-components';

type Props = {
  result: {
    startHour: number;
    endHour: number;
    totalCost: number;
    duration: number;
    windowPrices: number[];
  } | null;
  date: string;
};

export const Results: React.FC<Props> = ({ result, date }) => {
  if (!result) {
    return (
      <Card>
        <Text>No result to display.</Text>
      </Card>
    );
  }

  const start = `${String(result.startHour).padStart(2, '0')}:00`;
  const end = `${String(result.endHour).padStart(2, '0')}:00`;

  return (
    <Card>
      <Text weight="semibold" size={500}>
        Charging Plan for {date}
      </Text>
      <div style={{ marginTop: 12 }}>
        <Text>
          Start: <b>{start}</b>
        </Text>
        <Text>
          End: <b>{end}</b>
        </Text>
        <Text>
          Duration: <b>{result.duration} hours</b>
        </Text>
        <Text>
          Total Cost: <b>{result.totalCost} DKK</b>
        </Text>
      </div>
      <div style={{ marginTop: 12 }}>
        <Text size={300}>Hourly prices in window:</Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {result.windowPrices.map((p, i) => (
            <span
              key={i}
              style={{
                background: '#e5e5e5',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 14,
              }}
            >
              {p} DKK
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};
