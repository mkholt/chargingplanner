import React from 'react';

import { Input } from '@fluentui/react-components';
import {
  Clock24Regular,
  ClockAlarm24Regular,
} from '@fluentui/react-icons';

import { LabeledFormField } from '@/components/ui';

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
  return (
    <>
      <LabeledFormField icon={<Clock24Regular />} label="Earliest Start">
        <Input
          type="datetime-local"
          value={earliest}
          onChange={(_ev, data) => onEarliestChange(data.value)}
          style={{ width: '100%' }}
        />
      </LabeledFormField>
      <LabeledFormField icon={<ClockAlarm24Regular />} label="Latest End">
        <Input
          type="datetime-local"
          value={latest}
          onChange={(_ev, data) => onLatestChange(data.value)}
          style={{ width: '100%' }}
        />
      </LabeledFormField>
    </>
  );
};
