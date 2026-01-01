import React from 'react';

import { Button, Input, Text, tokens, Tooltip } from '@fluentui/react-components';
import {
  Clock24Regular,
  ClockAlarm24Regular,
  TargetArrow16Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { LabeledFormField } from '@/components/ui';
import {
  formatShortDate,
  formatTimeValue,
  getNextOccurrence,
  isToday,
  isTomorrow,
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
  const { t } = useTranslation();

  // Parse the datetime strings to Date objects
  const earliestDate = new Date(earliest);
  const latestDate = new Date(latest);

  /** Get translated date label */
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return t('time.today');
    if (isTomorrow(date)) return t('time.tomorrow');
    return formatShortDate(date);
  };

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
        label={t('time.earliestStart')}
        style={{ flex: 1 }}
      >
        <Input
          type="time"
          step={900}
          data-testid="earliest-time-picker"
          value={formatTimeValue(earliestDate)}
          onChange={handleEarliestChange}
          contentAfter={
            <Tooltip content={t('time.setToNow')} relationship="label">
              <Button
                size="small"
                appearance="transparent"
                icon={<TargetArrow16Regular />}
                onClick={handleNowClick}
                aria-label={t('time.setToNow')}
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
        label={t('time.latestEnd')}
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
