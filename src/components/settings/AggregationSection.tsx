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
import { useTranslation } from 'react-i18next';

import { type AggregationMethod, usePriceSettings } from '@/contexts';

const AGGREGATION_METHODS: AggregationMethod[] = ['mean', 'min', 'max'];

export const AggregationSection: React.FC = () => {
  const { t } = useTranslation();
  const { resolved, setAggregationSize, setAggregationMethod } = usePriceSettings();
  const { aggregationSize, aggregationMethod } = resolved;

  const isHourlyMode = aggregationSize === '1h';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">{t('aggregation.title')}</Text>

      {/* Hourly aggregation toggle with inline method dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Clock20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Switch
          checked={isHourlyMode}
          onChange={(_, data) => {
            setAggregationSize(data.checked ? '1h' : '15m');
          }}
          label={t('aggregation.useHourly')}
        />
        {/* Aggregation method dropdown - inline, only shown in hourly mode */}
        {isHourlyMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{t('aggregation.using')}</Text>
            <MathFormula20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
            <Dropdown
              value={t(`aggregation.methods.${aggregationMethod}.label`)}
              onOptionSelect={(_, data) => {
                setAggregationMethod(data.optionValue as AggregationMethod);
              }}
              placeholder={t('aggregation.selectMethod')}
              style={{ minWidth: 120 }}
            >
              {AGGREGATION_METHODS.map(method => (
                <Option key={method} value={method} text={t(`aggregation.methods.${method}.label`)}>
                  <div>
                    <div>{t(`aggregation.methods.${method}.label`)}</div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {t(`aggregation.methods.${method}.description`)}
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
          ? t('aggregation.hourlyDescription', { method: t(`aggregation.methods.${aggregationMethod}.label`).toLowerCase() })
          : t('aggregation.quarterHourDescription')}
      </Text>
    </div>
  );
};
