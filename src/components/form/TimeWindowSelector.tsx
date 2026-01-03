import React from 'react';

import { Button, Field, Input, Label, Text, tokens, Tooltip } from '@fluentui/react-components';
import { Clock16Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { useIsMobile } from '@/hooks';
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
  const isMobile = useIsMobile();

  // Parse the datetime strings to Date objects
  const earliestDate = new Date(earliest);
  const latestDate = new Date(latest);

  /** Get translated date label */
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return t('time.today');
    if (isTomorrow(date)) return t('time.tomorrow');
    return formatShortDate(date);
  };

  /** Render a time field with label and optional day marker */
  const renderTimeField = (
    labelText: string,
    date: Date,
    testId: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    contentAfter?: React.ReactElement
  ) => (
    <div style={{ flex: 1 }}>
      {/* Custom label row - on desktop shows day marker right-aligned */}
      <Stack
        horizontal
        justify="space-between"
        align="center"
        style={{ marginBottom: tokens.spacingVerticalXS }}
      >
        <Label>{labelText}</Label>
        {!isMobile && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {getDateLabel(date)}
          </Text>
        )}
      </Stack>
      <Field>
        <Input
          type="time"
          step={900}
          data-testid={testId}
          value={value}
          onChange={onChange}
          contentAfter={contentAfter}
        />
        {/* On mobile, show day marker below the input */}
        {isMobile && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'right', marginTop: tokens.spacingHorizontalXS }}>
            {getDateLabel(date)}
          </Text>
        )}
      </Field>
    </div>
  );

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
    <Stack horizontal gap={tokens.spacingHorizontalL}>
      {renderTimeField(
        t('time.earliestStart'),
        earliestDate,
        'earliest-time-picker',
        formatTimeValue(earliestDate),
        handleEarliestChange,
        <Tooltip content={t('time.setToNow')} relationship="label">
          <Button
            size="small"
            appearance="transparent"
            icon={<Clock16Regular />}
            onClick={handleNowClick}
            aria-label={t('time.setToNow')}
            data-testid="set-to-now-button"
          />
        </Tooltip>
      )}
      {renderTimeField(
        t('time.latestEnd'),
        latestDate,
        'latest-time-picker',
        formatTimeValue(latestDate),
        handleLatestChange
      )}
    </Stack>
  );
};
