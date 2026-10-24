import { type Context, Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';

import type { AppEnv } from '@proxy/env';
import { sha256 } from '@proxy/hash';
import { limitRequests, validate } from '@proxy/middleware';
import { problem } from '@proxy/problem';
import { ALLOWED_VEHICLE_PARTS, IncludeSchema, VinSchema } from '@proxy/schemas';
import type { TokenService } from '@proxy/tokens';
import type { SkodaClient } from '@proxy/upstream';

const IP_LIMIT_PER_MINUTE = 60;
const TOKEN_LIMIT_PER_MINUTE = 30;
const CACHE_MAX_ENTRIES = 500;

type CachedVehicle = { body: string; headers: Record<string, string> };

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
      .use(limitRequests({ limit: IP_LIMIT_PER_MINUTE, keyGenerator: (c) => `vehicles-ip:${c.get('clientIp')}` }))
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
          keyGenerator: (c) => `vehicles-token:${sha256(c.get('vehicleToken').key)}`,
        })
      )
      .get(
        '/:vin',
        validate('param', z.object({ vin: VinSchema })),
        validate('query', z.object({ include: IncludeSchema.optional() })),
        async (c) => {
          const { vin } = c.req.valid('param');
          const claims = c.get('vehicleToken');
          if (claims.vin !== vin) {
            return problem(c, 403, 'vin-not-allowed', 'The token is not valid for this vehicle');
          }

          const include = c.req.valid('query').include ?? [...ALLOWED_VEHICLE_PARTS];
          // Keyed per Škoda key so a revoked key never reads data cached for another one
          const cacheKey = `${sha256(claims.key)}:${vin}:${[...include].sort().join(',')}`;
          const cached = cache?.get(cacheKey);
          if (cached) return json(c, cached.body, cached.headers);

          const result = await skoda.getVehicle(vin, claims.key, include);
          c.set('upstreamTraceId', result.traceId);

          switch (result.status) {
            case 200: {
              const vehicle = { body: JSON.stringify(result.body), headers: result.headers };
              cache?.set(cacheKey, vehicle);
              return json(c, vehicle.body, vehicle.headers);
            }
            case 401:
              return problem(c, 401, 'key-revoked', 'The Škoda API key has expired or was revoked');
            case 403:
              return problem(c, 403, 'vehicle-access-denied', 'The Škoda API key no longer grants access');
            case 404:
              return problem(c, 404, 'vehicle-not-found', 'Vehicle not found');
            case 429:
              return problem(c, 429, 'rate-limited', 'Škoda API rate limit exceeded', {
                'Retry-After': result.headers['Retry-After'] ?? '60',
              });
            default:
              return problem(c, 502, 'upstream-unavailable', 'Škoda API is unavailable');
          }
        }
      )
  );
};
