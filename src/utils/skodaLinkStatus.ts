import type { SkodaLink } from '@/contexts';

import { MS_PER_DAY } from './constants';

/** Warn about an expiring Škoda key this many days ahead */
export const SKODA_EXPIRY_WARNING_DAYS = 14;

export type SkodaLinkStatus =
  /** Token available and valid for more than SKODA_EXPIRY_WARNING_DAYS */
  | 'linked'
  /** Token available, expires within SKODA_EXPIRY_WARNING_DAYS */
  | 'expiring'
  /** The key behind the token has expired */
  | 'expired'
  /** Token is in the locked vault */
  | 'locked'
  /** Revoked by Škoda, or the token is missing (vault reset, imported without access) */
  | 'relink';

export function getSkodaLinkStatus(
  link: SkodaLink,
  { hasToken, isLocked, isRevoked, now = new Date() }: {
    hasToken: boolean;
    isLocked: boolean;
    isRevoked: boolean;
    now?: Date;
  },
): SkodaLinkStatus {
  const msLeft = new Date(link.expiresAt).getTime() - now.getTime();
  if (!(msLeft > 0)) return 'expired';
  if (isRevoked) return 'relink';
  if (isLocked) return 'locked';
  if (!hasToken) return 'relink';
  return msLeft < SKODA_EXPIRY_WARNING_DAYS * MS_PER_DAY ? 'expiring' : 'linked';
}
