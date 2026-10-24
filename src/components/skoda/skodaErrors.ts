import type { TFunction } from 'i18next';

import { SkodaProxyError } from '@/api';
import { SkodaImportPasswordError } from '@/hooks';
import { WrongPasswordError } from '@/utils';

/** User-facing message for errors from linking, the proxy or the vault */
export function getSkodaErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof WrongPasswordError || error instanceof SkodaImportPasswordError) return t('skoda.vault.wrongPassword');
  if (!(error instanceof SkodaProxyError)) return t('skoda.link.errors.generic', { status: '?' });
  switch (error.problemType) {
    case 'invalid-api-key':
      return t('skoda.link.errors.invalidApiKey');
    case 'invalid-request':
      return t('skoda.link.errors.invalidRequest');
    case 'rate-limited':
      return t('skoda.link.errors.rateLimited');
    case 'network-error':
      return t('skoda.link.errors.networkError');
    default:
      return t('skoda.link.errors.generic', { status: error.status });
  }
}

/** Expiry date for display, e.g. "12 Jan 2027" */
export function formatExpiryDate(expiresAt: string, language: string): string {
  return new Date(expiresAt).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' });
}
