import React from 'react';

import { Button, Input, Text, tokens, Tooltip } from '@fluentui/react-components';
import {
  Clock24Regular,
  ClockAlarm24Regular,
  TargetArrow16Regular,
} from '@fluentui/react-icons';

import { LabeledFormField } from '@/components/ui';
import {
  formatTimeValue,
  getDateLabel,
  getNextOccurrence,
  roundToNext15Minutes,
  toDateTimeLocalString,
} from '@/utils';

type Props = {
  earliest: string;
  latest: string;
  onEarliestChange: (value: string) => void;
  onLatestChange: (value: string) => void;
};

export const TimeWindowSelector: React.FC<Props> = ({
  earliest,
  latest,
  onEarliestChange,
  onLatestChange,
}) => {
  // Parse the datetime strings to Date objects
  const earliestDate = new Date(earliest);
  const latestDate = new Date(latest);

  const handleEarliestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value; // "HH:mm" format
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const now = new Date();
      const date = getNextOccurrence(hours, minutes, now);
      onEarliestChange(toDateTimeLocalString(date));
    }
  };

  const handleLatestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value; // "HH:mm" format
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      // Latest must be after earliest, so use earliestDate as reference
      const date = getNextOccurrence(hours, minutes, earliestDate);
      onLatestChange(toDateTimeLocalString(date));
    }
  };

  const handleNowClick = () => {
    const now = roundToNext15Minutes(new Date());
    onEarliestChange(toDateTimeLocalString(now));
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <LabeledFormField
        icon={<Clock24Regular />}
        label="Earliest Start"
        style={{ flex: 1 }}
      >
        <Input
          type="time"
          step={900}
          data-testid="earliest-time-picker"
          value={formatTimeValue(earliestDate)}
          onChange={handleEarliestChange}
          contentAfter={
            <Tooltip content="Set to now" relationship="label">
              <Button
                size="small"
                appearance="transparent"
                icon={<TargetArrow16Regular />}
                onClick={handleNowClick}
                aria-label="Set to now"
                data-testid="set-to-now-button"
              />
            </Tooltip>
          }
        />
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'right', marginTop: 4 }}>
          {getDateLabel(earliestDate)}
        </Text>
      </LabeledFormField>
      <LabeledFormField
        icon={<ClockAlarm24Regular />}
        label="Latest End"
        style={{ flex: 1 }}
      >
        <Input
          type="time"
          step={900}
          data-testid="latest-time-picker"
          value={formatTimeValue(latestDate)}
          onChange={handleLatestChange}
        />
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'right', marginTop: 4 }}>
          {getDateLabel(latestDate)}
        </Text>
      </LabeledFormField>
    </div>
  );
};
