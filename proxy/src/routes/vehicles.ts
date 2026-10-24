import { createHash } from 'node:crypto';

import { type Context, Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';

import type { AppEnv } from '@proxy/env';
import { limitRequests, validate } from '@proxy/middleware';
import { problem, upstreamProblem } from '@proxy/problem';
import { ALLOWED_VEHICLE_PARTS, IncludeSchema, VinSchema } from '@proxy/schemas';
import type { TokenService } from '@proxy/tokens';
import type { SkodaClient } from '@proxy/upstream';

const IP_LIMIT_PER_MINUTE = 60;
const TOKEN_LIMIT_PER_MINUTE = 30;
const CACHE_MAX_ENTRIES = 500;
/** Rate-limit headers describe the upstream call that was made, so only the key expiry is replayed from cache. */
const CACHED_HEADER = 'X-API-Key-Expires-At';

type CachedVehicle = { body: string; keyExpiresAt: string | undefined };

/** Stable identifier for a Škoda key, so the key itself is never used as a cache or rate-limit key. */
const keyId = (key: string) => createHash('sha256').update(key).digest('hex');

export const vehicleRoutes = ({
  tokens,
  skoda,
  cacheTtlSeconds,
}: {
  tokens: TokenService;
  skoda: SkodaClient;
  cacheTtlSeconds: number;
}) => {
  const cache =
    cacheTtlSeconds > 0
      ? new LRUCache<string, CachedVehicle>({ max: CACHE_MAX_ENTRIES, ttl: cacheTtlSeconds * 1000 })
      : null;

  const json = (c: Context<AppEnv>, body: string, headers: Record<string, string>) =>
    c.body(body, 200, { ...headers, 'Content-Type': 'application/json' });

  return (
    new Hono<AppEnv>()
      // Bounds unauthenticated decryption attempts per client
      .use(limitRequests({ limit: IP_LIMIT_PER_MINUTE, keyGenerator: (c) => `vehicles-ip:${c.get('clientKey')}` }))
      // Authentication runs before routing: unauthenticated callers learn nothing about routes
      .use(
        bearerAuth<AppEnv>({
          verifyToken: async (token, c) => {
            const claims = await tokens.verify(token);
            if (!claims) return false;
            c.set('vehicleToken', claims);
            return true;
          },
        })
      )
      .use(
        limitRequests({
          limit: TOKEN_LIMIT_PER_MINUTE,
          keyGenerator: (c) => `vehicles-token:${keyId(c.get('vehicleToken').key)}`,
        })
      )
      .get(
        '/:vin',
        validate('param', z.object({ vin: VinSchema })),
        validate('query', z.object({ include: IncludeSchema.optional() })),
        async (c) => {
          const { vin } = c.req.valid('param');
          c.set('vin', vin);
          const claims = c.get('vehicleToken');
          if (claims.vin !== vin) {
            return problem(c, 403, 'vin-not-allowed', 'The token is not valid for this vehicle');
          }

          const include = c.req.valid('query').include ?? [...ALLOWED_VEHICLE_PARTS];
          // Keyed per Škoda key so a revoked key never reads data cached for another one
          const cacheKey = `${keyId(claims.key)}:${vin}:${[...include].sort().join(',')}`;
          const cached = cache?.get(cacheKey);
          if (cached) {
            return json(c, cached.body, cached.keyExpiresAt ? { [CACHED_HEADER]: cached.keyExpiresAt } : {});
          }

          const result = await skoda.getVehicle(vin, claims.key, include);

          switch (result.status) {
            case 200: {
              const body = JSON.stringify(result.body);
              cache?.set(cacheKey, { body, keyExpiresAt: result.headers[CACHED_HEADER] });
              return json(c, body, result.headers);
            }
            case 401:
              return problem(c, 401, 'key-revoked', 'The Škoda API key has expired or was revoked');
            case 403:
              return problem(c, 403, 'vehicle-access-denied', 'The Škoda API key no longer grants access');
            case 404:
              return problem(c, 404, 'vehicle-not-found', 'Vehicle not found');
            default:
              return upstreamProblem(c, result);
          }
        }
      )
  );
};
