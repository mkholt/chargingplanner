import {
  Button,
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CalendarClock24Regular,
  Info24Regular,
  Warning24Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { ChargingPlanHeader, PriceTimeline } from '@/components';
import { AlertBox, Stack } from '@/components/ui';
import { useCars, usePriceSettings } from '@/contexts';
import { type FormInput, useChargingResults } from '@/hooks';
import type { PricesApiResponse } from '@/types';
import { formatTime, getErrorMessage, getPriceSourceString } from '@/utils';

type Props = {
  formInput: FormInput | null;
  priceData: PricesApiResponse | undefined;
  priceError: Error | null;
  onOpenSettings?: () => void;
};

/** Build subtitle from contexts */
function useSubtitle(): string {
  const { selectedCar } = useCars();
  const { resolved: priceSettings } = usePriceSettings();
  const { t } = useTranslation();

  const priceSource = getPriceSourceString(priceSettings, t);

  return selectedCar
    ? `${selectedCar.name} · ${priceSource}`
    : priceSource;
}

export const Results: React.FC<Props> = ({
  formInput,
  priceData,
  priceError,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const subtitle = useSubtitle();

  // Calculate results from raw inputs
  const { result, slots, intervalMinutes, chargingSpeed, error, warning } =
    useChargingResults(formInput, priceData);

  const secondary = tokens.colorNeutralForeground2;

  // Show error state when price data failed to load
  if (priceError) {
    return (
      <Card style={{
        padding: 16,
        background: tokens.colorNeutralBackground2,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      }}>
        <Stack horizontal gap={8} align="center" style={{ marginBottom: 12 }}>
          <CalendarClock24Regular />
          <Stack gap={0}>
            <Text weight="semibold" size={400} style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
              {t('results.chargingPlan')}
            </Text>
            <Text size={200} style={{ color: secondary }}>
              {subtitle}
            </Text>
          </Stack>
        </Stack>
        <AlertBox
          variant="error"
          icon={<Warning24Regular />}
          title={t('errors.pricingUnavailable')}
          data-testid="price-error"
          action={onOpenSettings && (
            <Button appearance="primary" size="small" onClick={onOpenSettings}>
              {t('errors.openSettings')}
            </Button>
          )}
        >
          {t('errors.pricingUnavailableDetail')}
        </AlertBox>
      </Card>
    );
  }

  if (!slots.length) {
    return (
      <Card>
        <Text>{t('results.noResult')}</Text>
      </Card>
    );
  }

  // Filter slots using timestamps: show from current interval to end of valid data
  const now = new Date();
  const currentIntervalStart = new Date(now);
  // Round down to the start of the current interval
  const currentMinutes = currentIntervalStart.getMinutes();
  currentIntervalStart.setMinutes(Math.floor(currentMinutes / intervalMinutes) * intervalMinutes, 0, 0);

  // Filter using slot timestamps directly
  const filteredSlots = slots.filter(slot =>
    slot.timestamp >= currentIntervalStart && slot.hasData
  );

  return (
    <Card style={{
      padding: 16,
      background: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    }}>
      <ChargingPlanHeader result={result} />
      {!result && error && error.type !== 'no_input' && (
        <AlertBox
          variant="warning"
          icon={<Warning24Regular />}
          data-testid="result-error"
          style={{ marginBottom: 12 }}
        >
          {getErrorMessage(error, t)}
        </AlertBox>
      )}
      {warning && (
        <AlertBox
          variant="info"
          icon={<Info24Regular />}
          data-testid="result-warning"
          style={{ marginBottom: 12 }}
        >
          {t('warnings.partialData', { time: formatTime(warning.validUntil) })}
        </AlertBox>
      )}
      <PriceTimeline
        slots={filteredSlots}
        chargingStart={result?.startTime}
        chargingEnd={result?.endTime}
        chargingSpeed={chargingSpeed}
        intervalMinutes={intervalMinutes}
      />
    </Card>
  );
};
