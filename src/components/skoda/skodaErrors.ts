import type { TFunction } from 'i18next';

import { SkodaProxyError } from '@/api';
import {
  PasswordTooShortError,
  VAULT_MIN_PASSWORD_LENGTH,
  VaultLockedError,
  WrongExportCodeError,
  WrongPasswordError,
} from '@/utils';

/** User-facing message for errors from linking, the proxy or the vault */
export function getSkodaErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof WrongPasswordError) return t('skoda.vault.wrongPassword');
  if (error instanceof WrongExportCodeError) return t('skoda.sync.wrongExportCode');
  if (error instanceof VaultLockedError) return t('skoda.vault.lockedError');
  if (error instanceof PasswordTooShortError) return t('skoda.vault.passwordTooShort', { count: VAULT_MIN_PASSWORD_LENGTH });
  if (!(error instanceof SkodaProxyError)) return t('skoda.unexpectedError');
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
    case 'invalid-response':
      return t('skoda.link.errors.invalidResponse');
    default:
      return t('skoda.link.errors.generic', { status: error.status });
  }
}
