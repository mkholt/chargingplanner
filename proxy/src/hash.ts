import { createHash } from 'node:crypto';

/** Stable identifier for a secret (cache and rate-limit keys) without keeping the secret itself as a key. */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
