import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import type { AppEnv } from '@proxy/env';
import { limitRequests, validate } from '@proxy/middleware';
import { problem } from '@proxy/problem';
import { VinSchema } from '@proxy/schemas';
import type { TokenService } from '@proxy/tokens';
import type { SkodaClient } from '@proxy/upstream';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Used when Škoda does not report the key's expiry. */
const FALLBACK_TOKEN_LIFETIME_MS = 30 * DAY_MS;
const MAX_TOKEN_LIFETIME_MS = 365 * DAY_MS;
const MAX_BODY_BYTES = 2048;
const ISSUE_LIMIT_PER_MINUTE = 5;

const IssueTokenSchema = z.object({
  apiKey: z.string().min(1).max(512),
  vin: VinSchema,
});

/** Token expiry follows the Škoda key's expiry (X-API-Key-Expires-At), capped to a year. */
const tokenExpiry = (keyExpiresAt: string | undefined) => {
  const now = Date.now();
  const parsed = keyExpiresAt ? Date.parse(keyExpiresAt) : NaN;
  if (Number.isNaN(parsed)) return new Date(now + FALLBACK_TOKEN_LIFETIME_MS);
  return new Date(Math.min(parsed, now + MAX_TOKEN_LIFETIME_MS));
};

export const tokenRoutes = ({ tokens, skoda }: { tokens: TokenService; skoda: SkodaClient }) =>
  new Hono<AppEnv>().post(
    '/',
    limitRequests({ limit: ISSUE_LIMIT_PER_MINUTE, keyGenerator: (c) => `tokens:${c.get('clientIp')}` }),
    bodyLimit({ maxSize: MAX_BODY_BYTES }),
    validate('json', IssueTokenSchema),
    async (c) => {
      const { apiKey, vin } = c.req.valid('json');

      // Proves the key works and is bound to this VIN before anything is issued
      const result = await skoda.getVehicle(vin, apiKey, ['info']);
      c.set('upstreamTraceId', result.traceId);

      switch (result.status) {
        case 200: {
          const expiresAt = tokenExpiry(result.headers['X-API-Key-Expires-At']);
          const token = await tokens.issue({ vin, key: apiKey }, expiresAt);
          return c.json({ token, vin, expiresAt: expiresAt.toISOString() }, 201);
        }
        case 401:
        case 403:
        case 404:
          return problem(c, 422, 'invalid-api-key', 'The Škoda API key is not valid for this vehicle');
        case 429:
          return problem(c, 429, 'rate-limited', 'Škoda API rate limit exceeded', {
            'Retry-After': result.headers['Retry-After'] ?? '60',
          });
        default:
          return problem(c, 502, 'upstream-unavailable', 'Škoda API is unavailable');
      }
    }
  );
