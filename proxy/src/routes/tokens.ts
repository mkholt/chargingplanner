import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import type { AppEnv } from '@proxy/env';
import { limitRequests, validate } from '@proxy/middleware';
import { problem, upstreamProblem } from '@proxy/problem';
import { VinSchema } from '@proxy/schemas';
import type { TokenService } from '@proxy/tokens';
import type { SkodaClient } from '@proxy/upstream';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Used when Škoda does not report the key's expiry. */
const FALLBACK_TOKEN_LIFETIME_MS = 30 * DAY_MS;
const MAX_TOKEN_LIFETIME_MS = 365 * DAY_MS;
const MAX_BODY_BYTES = 2048;
const ISSUE_LIMIT_PER_MINUTE = 5;
/** Caps key checks sent to Škoda from all clients together, so the proxy cannot be used to test keys in bulk. */
const ISSUE_GLOBAL_LIMIT_PER_MINUTE = 30;

const IssueTokenSchema = z.object({
  // Printable ASCII only: anything else cannot be sent as an HTTP header value
  apiKey: z.string().min(1).max(512).regex(/^[\x21-\x7E]+$/),
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
    limitRequests({ limit: ISSUE_LIMIT_PER_MINUTE, keyGenerator: (c) => `tokens:${c.get('clientKey')}` }),
    bodyLimit({ maxSize: MAX_BODY_BYTES }),
    validate('json', IssueTokenSchema),
    // After validation, so only requests that would reach Škoda count
    limitRequests({ limit: ISSUE_GLOBAL_LIMIT_PER_MINUTE, keyGenerator: () => 'tokens:all' }),
    async (c) => {
      const { apiKey, vin } = c.req.valid('json');
      c.set('vin', vin);

      // Proves the key works and is bound to this VIN before anything is issued
      const result = await skoda.getVehicle(vin, apiKey, ['info']);

      switch (result.status) {
        case 200: {
          const expiresAt = tokenExpiry(result.headers['X-API-Key-Expires-At']);
          if (expiresAt.getTime() <= Date.now()) {
            return problem(c, 422, 'invalid-api-key', 'The Škoda API key has expired');
          }
          const token = await tokens.issue({ vin, key: apiKey }, expiresAt);
          return c.json({ token, vin, expiresAt: expiresAt.toISOString() }, 201);
        }
        case 401:
        case 403:
        case 404:
          return problem(c, 422, 'invalid-api-key', 'The Škoda API key is not valid for this vehicle');
        default:
          return upstreamProblem(c, result);
      }
    }
  );
