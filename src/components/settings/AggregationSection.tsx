import React from 'react';

import {
  Dropdown,
  Option,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Clock20Regular,
  MathFormula20Regular,
} from '@fluentui/react-icons';

import { type AggregationMethod, usePriceSettings } from '@/contexts';

const AGGREGATION_METHOD_OPTIONS: { value: AggregationMethod; label: string; description: string }[] = [
  { value: 'mean', label: 'Mean', description: 'Average of values in interval' },
  { value: 'min', label: 'Minimum', description: 'Lowest value in interval' },
  { value: 'max', label: 'Maximum', description: 'Highest value in interval' },
];

export const AggregationSection: React.FC = () => {
  const { resolved, setAggregationSize, setAggregationMethod } = usePriceSettings();
  const { aggregationSize, aggregationMethod } = resolved;

  const isHourlyMode = aggregationSize === '1h';
  const methodOption = AGGREGATION_METHOD_OPTIONS.find(o => o.value === aggregationMethod);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Advanced</Text>

      {/* Hourly aggregation toggle with inline method dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Clock20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Switch
          checked={isHourlyMode}
          onChange={(_, data) => {
            setAggregationSize(data.checked ? '1h' : '15m');
          }}
          label="Use 1-hour aggregation"
        />
        {/* Aggregation method dropdown - inline, only shown in hourly mode */}
        {isHourlyMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>using</Text>
            <MathFormula20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
            <Dropdown
              value={methodOption?.label ?? 'Mean'}
              onOptionSelect={(_, data) => {
                setAggregationMethod(data.optionValue as AggregationMethod);
              }}
              placeholder="Select method"
              style={{ minWidth: 120 }}
            >
              {AGGREGATION_METHOD_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value} text={opt.label}>
                  <div>
                    <div>{opt.label}</div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {opt.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Dropdown>
          </div>
        )}
      </div>

      <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginLeft: 28 }}>
        {isHourlyMode
          ? `Aggregating to hourly using ${methodOption?.label.toLowerCase() ?? 'mean'}`
          : 'Showing prices at original 15-minute resolution'}
      </Text>
    </div>
  );
};
