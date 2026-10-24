import type { TFunction } from 'i18next';

import { SkodaProxyError } from '@/api';
import { PasswordTooShortError, VAULT_MIN_PASSWORD_LENGTH, WrongPasswordError } from '@/utils';

/** User-facing message for errors from linking, the proxy or the vault */
export function getSkodaErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof WrongPasswordError) {
    return error.field === 'exportCode' ? t('skoda.sync.wrongExportCode') : t('skoda.vault.wrongPassword');
  }
  if (error instanceof PasswordTooShortError) return t('skoda.vault.passwordTooShort', { count: VAULT_MIN_PASSWORD_LENGTH });
  if (!(error instanceof SkodaProxyError)) return t('skoda.link.errors.generic', { status: '?' });
  switch (error.problemType) {
    case 'invalid-api-key':
      return t('skoda.link.errors.invalidApiKey');
    case 'key-revoked':
      return t('skoda.link.errors.keyRevoked');
    case 'vin-not-allowed':
    case 'vehicle-access-denied':
      return t('skoda.link.errors.vehicleAccessDenied');
    case 'vehicle-not-found':
      return t('skoda.link.errors.vehicleNotFound');
    case 'invalid-request':
      return t('skoda.link.errors.invalidRequest');
    case 'rate-limited':
      return t('skoda.link.errors.rateLimited');
    case 'upstream-unavailable':
      return t('skoda.link.errors.upstreamUnavailable');
    case 'network-error':
      return t('skoda.link.errors.networkError');
    default:
      return t('skoda.link.errors.generic', { status: error.status });
  }
}
