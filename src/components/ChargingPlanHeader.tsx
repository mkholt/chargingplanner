import React from 'react';

import {
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CalendarClock24Regular,
  Clock16Regular,
  Flash16Regular,
  Money16Regular,
  Play16Regular,
  Stop16Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { InfoPopover, Stack } from '@/components/ui';
import { useCars, usePriceSettings } from '@/contexts';
import { CHARGING_EFFICIENCY, formatDuration, getPriceSourceString, type ChargingResult } from '@/utils';

type Props = {
  result: ChargingResult | null;
};

export const ChargingPlanHeader: React.FC<Props> = ({
  result,
}) => {
  const { t } = useTranslation();
  const { selectedCar } = useCars();
  const { resolved: priceSettings } = usePriceSettings();

  const secondary = tokens.colorNeutralForeground2;
  const bg = tokens.colorNeutralBackground2;
  const border = tokens.colorNeutralStroke1;
  const text = tokens.colorNeutralForeground1;
  const brand = tokens.colorBrandForeground1;

  // Build subtitle with car name and price source
  const priceSource = getPriceSourceString(priceSettings, t);
  const subtitle = selectedCar
    ? `${selectedCar.name} · ${priceSource}`
    : priceSource;

  return (
    <>
      <Stack horizontal gap={8} align="center" style={{ marginBottom: 12 }}>
        <CalendarClock24Regular />
        <Stack gap={0}>
          <Text weight="semibold" size={400} data-testid="charging-plan-header" style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
            {t('results.chargingPlan')}
          </Text>
          <Text size={200} style={{ color: secondary }}>
            {subtitle}
          </Text>
        </Stack>
      </Stack>
      {result && (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: 12,
            background: bg,
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: tokens.shadow2,
            border: `1px solid ${border}`,
            color: text,
          }}
        >
          <div data-testid="result-start">
            <Stack horizontal gap={4} align="center" style={{ color: secondary }}>
              <Play16Regular />
              <Text size={200} style={{ color: secondary }}>{t('results.start')}</Text>
            </Stack>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {result.startTime.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div data-testid="result-end">
            <Stack horizontal gap={4} align="center" style={{ color: secondary }}>
              <Stop16Regular />
              <Text size={200} style={{ color: secondary }}>{t('results.end')}</Text>
            </Stack>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {result.endTime.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div data-testid="result-duration">
            <Stack horizontal gap={4} align="center" style={{ color: secondary }}>
              <Clock16Regular />
              <Text size={200} style={{ color: secondary }}>{t('results.duration')}</Text>
            </Stack>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {formatDuration(result.durationHours)}
            </div>
          </div>
          <div data-testid="result-energy">
            <Stack horizontal gap={4} align="center" style={{ color: secondary }}>
              <Flash16Regular />
              <Text size={200} style={{ color: secondary }}>{t('results.energy')}</Text>
            </Stack>
            <InfoPopover
              trigger={<>{result.energyNeeded.toFixed(1)} kWh</>}
              ariaLabel={t('results.energyBreakdown')}
            >
              <div>
                <div>{t('results.toBattery', { amount: (result.energyNeeded * CHARGING_EFFICIENCY).toFixed(1) })}</div>
                <div>{t('results.chargingLoss', { percent: ((1 - CHARGING_EFFICIENCY) * 100).toFixed(0) })}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{t('results.fromGrid', { amount: result.energyNeeded.toFixed(1) })}</div>
              </div>
            </InfoPopover>
          </div>
          <div data-testid="result-cost">
            <Stack horizontal gap={4} align="center" style={{ color: secondary }}>
              <Money16Regular />
              <Text size={200} style={{ color: secondary }}>{t('results.estCost')}</Text>
            </Stack>
            <InfoPopover
              trigger={<>{result.totalCost} DKK</>}
              ariaLabel={t('results.costBreakdown')}
              color={brand}
              fontSize={16}
              fontWeight={700}
            >
              <div>
                {result.costBreakdown ? (
                  <>
                    <div>{t('results.spotPortion', { amount: result.costBreakdown.spotCost.toFixed(2) })}</div>
                    <div>{t('results.tariffsPortion', { amount: result.costBreakdown.tariffCost.toFixed(2) })}</div>
                  </>
                ) : (
                  <div>{result.energyNeeded.toFixed(1)} kWh × {(result.totalCost / result.energyNeeded).toFixed(2)} DKK/kWh</div>
                )}
                <div style={{ fontWeight: 600, marginTop: 4 }}>{t('results.totalCost', { amount: result.totalCost.toFixed(2) })}</div>
              </div>
            </InfoPopover>
          </div>
        </div>
      )}
    </>
  );
};
