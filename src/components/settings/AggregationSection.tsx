import React from 'react';

import {
  Dropdown,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Clock20Regular,
  MathFormula20Regular,
} from '@fluentui/react-icons';

import type { AggregationMethod, AggregationSize } from '@/hooks';

type Props = {
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
  onAggregationSizeChange: (size: AggregationSize) => void;
  onAggregationMethodChange: (method: AggregationMethod) => void;
};

const AGGREGATION_SIZE_OPTIONS: { value: AggregationSize; label: string; description: string }[] = [
  { value: '15m', label: '15 minutes', description: 'Original resolution' },
  { value: '1h', label: '1 hour', description: 'Aggregated to hourly' },
];

const AGGREGATION_METHOD_OPTIONS: { value: AggregationMethod; label: string; description: string }[] = [
  { value: 'mean', label: 'Average', description: 'Mean of values in interval' },
  { value: 'min', label: 'Minimum', description: 'Lowest value in interval' },
  { value: 'max', label: 'Maximum', description: 'Highest value in interval' },
];

export const AggregationSection: React.FC<Props> = ({
  aggregationSize,
  aggregationMethod,
  onAggregationSizeChange,
  onAggregationMethodChange,
}) => {
  const sizeOption = AGGREGATION_SIZE_OPTIONS.find(o => o.value === aggregationSize);
  const methodOption = AGGREGATION_METHOD_OPTIONS.find(o => o.value === aggregationMethod);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Price Aggregation</Text>

      {/* Aggregation size dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Dropdown
          value={sizeOption?.label ?? 'Select interval'}
          onOptionSelect={(_, data) => {
            onAggregationSizeChange(data.optionValue as AggregationSize);
          }}
          placeholder="Select interval"
          style={{ flex: 1 }}
        >
          {AGGREGATION_SIZE_OPTIONS.map(opt => (
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

      {/* Aggregation method dropdown - only relevant for 1h */}
      {aggregationSize === '1h' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MathFormula20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
          <Dropdown
            value={methodOption?.label ?? 'Select method'}
            onOptionSelect={(_, data) => {
              onAggregationMethodChange(data.optionValue as AggregationMethod);
            }}
            placeholder="Select method"
            style={{ flex: 1 }}
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
  );
};
