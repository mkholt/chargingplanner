import type { TFunction } from 'i18next';

import { CALCULATION_ERROR_CODES, formatDuration, formatTime } from '@/utils';

import type { CalculationError } from '@/hooks/useChargingResults';

/** Get translated error message for a calculation error */
export function getErrorMessage(
  error: CalculationError,
  t: TFunction
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
