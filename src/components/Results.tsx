import { useMemo } from 'react';

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
import { useCars, usePriceSettings } from '@/contexts';
import type { en } from '@/locales/en';
import type { PricesApiResponse } from '@/types';
import {
  buildTimeline,
  CALCULATION_ERROR_CODES,
  findOptimalChargingWindow,
  formatDuration,
  formatTime,
  MS_PER_MINUTE,
  type CalculationErrorCode,
  type ChargingResult,
  type PriceSlot,
} from '@/utils';

type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

type Props = {
  formInput: FormInput | null;
  priceData: PricesApiResponse | undefined;
  priceError: Error | null;
  onOpenSettings?: () => void;
};

type CalculationError =
  | { type: 'no_input' }
  | { type: 'no_timeline'; code: CalculationErrorCode }
  | { type: 'time_too_short'; availableHours: number; requiredHours: number }
  | { type: 'invalid_params'; code: CalculationErrorCode }
  | { type: 'incomplete_data'; validUntil: Date };

type CalculationResults = {
  result: ChargingResult | null;
  slots: PriceSlot[];
  intervalMinutes: number;
  chargingSpeed: number | undefined;
  error: CalculationError | null;
  /** Warning when user's window extends beyond available data */
  warning: { type: 'partial_data'; validUntil: Date } | null;
};

function calculateResults(
  input: FormInput | null,
  priceData: PricesApiResponse | undefined
): CalculationResults {
  const emptyResults: CalculationResults = {
    result: null,
    slots: [],
    intervalMinutes: 60,
    chargingSpeed: undefined,
    error: null,
    warning: null,
  };

  if (!input || !priceData) {
    return { ...emptyResults, error: { type: 'no_input' } };
  }

  const earliestDate = new Date(input.earliest);
  const latestDate = new Date(input.latest);

  // Build timeline of prices from now to end of available data
  // Resolution is determined by the API response (based on aggregation param we sent)
  const timeline = buildTimeline(earliestDate, latestDate, priceData);
  if (!timeline) {
    return {
      ...emptyResults,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.NO_PRICE_DATA },
    };
  }

  // Validate interval duration using the timeline's interval size
  const msPerInterval = timeline.intervalMinutes * MS_PER_MINUTE;
  const intervalCount = Math.floor((latestDate.getTime() - earliestDate.getTime()) / msPerInterval) + 1;
  if (intervalCount <= 0) {
    return {
      ...emptyResults,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.WINDOW_TOO_SHORT },
    };
  }

  // Check if we have valid price data using timestamp comparison
  const hasValidData = timeline.slots.some(s => s.hasData);
  if (!hasValidData) {
    return {
      ...emptyResults,
      slots: timeline.slots,
      intervalMinutes: timeline.intervalMinutes,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.PRICES_NOT_PUBLISHED },
    };
  }

  // Use timestamp-based validDataEndTime from timeline
  const validDataEndTime = timeline.validDataEndTime;

  // Check if user's window extends beyond available data (using timestamps)
  let warning: CalculationResults['warning'] = null;
  if (latestDate > validDataEndTime && earliestDate < validDataEndTime) {
    warning = { type: 'partial_data', validUntil: validDataEndTime };
  }

  // If the entire charging window is beyond valid data, show error
  if (earliestDate >= validDataEndTime) {
    return {
      ...emptyResults,
      slots: timeline.slots,
      intervalMinutes: timeline.intervalMinutes,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'incomplete_data', validUntil: validDataEndTime },
    };
  }

  // Calculate required charging duration for error messages
  const kWhNeeded = ((input.endPercent - input.startPercent) / 100) * input.batterySize;
  const requiredHours = kWhNeeded / input.chargingSpeed;

  // Calculate available hours using timestamps
  const effectiveLatestEnd = new Date(Math.min(latestDate.getTime(), validDataEndTime.getTime()));
  const availableMs = effectiveLatestEnd.getTime() - earliestDate.getTime();
  const availableHours = availableMs / (60 * 60 * 1000);

  // Find optimal charging window using timestamp-based interface
  const calcResult = findOptimalChargingWindow({
    startPercent: input.startPercent,
    endPercent: input.endPercent,
    batterySize: input.batterySize,
    chargingSpeed: input.chargingSpeed,
    slots: timeline.slots,
    intervalMinutes: timeline.intervalMinutes,
    earliestStart: earliestDate,
    latestEnd: effectiveLatestEnd,
  });

  // Determine error if calculation failed
  let error: CalculationError | null = null;
  if (!calcResult) {
    if (input.endPercent <= input.startPercent) {
      error = { type: 'invalid_params', code: CALCULATION_ERROR_CODES.END_LESS_THAN_START };
    } else if (input.chargingSpeed <= 0 || input.batterySize <= 0) {
      error = { type: 'invalid_params', code: CALCULATION_ERROR_CODES.INVALID_POSITIVE_VALUES };
    } else if (requiredHours > availableHours) {
      error = { type: 'time_too_short', availableHours, requiredHours };
    } else {
      error = { type: 'no_timeline', code: CALCULATION_ERROR_CODES.CALCULATION_FAILED };
    }
  }

  return {
    result: calcResult,
    slots: timeline.slots,
    intervalMinutes: timeline.intervalMinutes,
    chargingSpeed: input.chargingSpeed,
    error,
    warning,
  };
}

/** Infer error translation keys from the English translation object */
type ErrorTranslationKey = `errors.${keyof typeof en.translation.errors}`;

/** Get translated error message */
function getErrorMessage(
  error: CalculationError,
  t: (key: ErrorTranslationKey, params?: Record<string, string>) => string
): string {
  switch (error.type) {
    case 'no_input':
      return t('errors.enterParameters');
    case 'no_timeline':
      switch (error.code) {
        case CALCULATION_ERROR_CODES.NO_PRICE_DATA:
          return t('errors.noPriceData');
        case CALCULATION_ERROR_CODES.WINDOW_TOO_SHORT:
          return t('errors.windowTooShort');
        case CALCULATION_ERROR_CODES.PRICES_NOT_PUBLISHED:
          return t('errors.noPriceDataYet');
        case CALCULATION_ERROR_CODES.CALCULATION_FAILED:
        default:
          return t('errors.unableToCalculate');
      }
    case 'invalid_params':
      switch (error.code) {
        case CALCULATION_ERROR_CODES.END_LESS_THAN_START:
          return t('errors.endGreaterThanStart');
        case CALCULATION_ERROR_CODES.INVALID_POSITIVE_VALUES:
          return t('errors.positiveValues');
        default:
          return t('errors.unableToCalculate');
      }
    case 'time_too_short':
      return t('errors.notEnoughTime', {
        required: formatDuration(error.requiredHours),
        available: formatDuration(error.availableHours),
      });
    case 'incomplete_data':
      return t('errors.incompleteData', { time: formatTime(error.validUntil) });
  }
}

/** Build subtitle from contexts */
function useSubtitle(): string {
  const { cars, selectedCarId } = useCars();
  const { resolved: priceSettings } = usePriceSettings();

  const selectedCar = cars.find(c => c.id === selectedCarId);

  const priceSource = (() => {
    const { company, product, supplier, priceArea, priceAreaSource } = priceSettings;

    if (company && product) {
      return `${company.name} - ${product.name}`;
    }
    if (supplier) {
      return `${supplier.name} (${priceArea})`;
    }
    return priceAreaSource === 'manual'
      ? `Spot price ${priceArea}`
      : `${priceArea}`;
  })();

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
  const { result, slots, intervalMinutes, chargingSpeed, error, warning } = useMemo(
    () => calculateResults(formInput, priceData),
    [formInput, priceData]
  );

  const secondary = tokens.colorNeutralForeground2;

  // Show error state when price data failed to load
  if (priceError) {
    return (
      <Card style={{
        padding: 16,
        background: tokens.colorNeutralBackground2,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CalendarClock24Regular />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text weight="semibold" size={400} style={{ fontSize: 'clamp(0.875rem, 3vw, 1.1rem)' }}>
              {t('results.chargingPlan')}
            </Text>
            <Text size={200} style={{ color: secondary }}>
              {subtitle}
            </Text>
          </div>
        </div>
        <div
          data-testid="price-error"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: tokens.colorPaletteRedBackground1,
            borderRadius: 6,
            border: `1px solid ${tokens.colorPaletteRedBorder1}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Warning24Regular style={{ color: tokens.colorPaletteRedForeground1, flexShrink: 0 }} />
            <div>
              <Text weight="semibold" style={{ color: tokens.colorPaletteRedForeground1, display: 'block' }}>
                {t('errors.pricingUnavailable')}
              </Text>
              <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                {t('errors.pricingUnavailableDetail')}
              </Text>
            </div>
          </div>
          {onOpenSettings && (
            <Button
              appearance="primary"
              size="small"
              onClick={onOpenSettings}
            >
              {t('errors.openSettings')}
            </Button>
          )}
        </div>
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
        <div
          data-testid="result-error"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 12,
            marginBottom: 12,
            background: tokens.colorPaletteYellowBackground1,
            borderRadius: 6,
            border: `1px solid ${tokens.colorPaletteYellowBorder1}`,
          }}
        >
          <Warning24Regular style={{ color: tokens.colorPaletteYellowForeground1, flexShrink: 0 }} />
          <Text style={{ color: tokens.colorPaletteYellowForeground1 }}>
            {getErrorMessage(error, t)}
          </Text>
        </div>
      )}
      {warning && (
        <div
          data-testid="result-warning"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 12,
            marginBottom: 12,
            background: tokens.colorPaletteBlueBackground2,
            borderRadius: 6,
            border: `1px solid ${tokens.colorPaletteBlueBackground2}`,
          }}
        >
          <Info24Regular style={{ color: tokens.colorPaletteBlueForeground2, flexShrink: 0 }} />
          <Text style={{ color: tokens.colorPaletteBlueForeground2 }}>
            {t('warnings.partialData', { time: formatTime(warning.validUntil) })}
          </Text>
        </div>
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
