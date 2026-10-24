import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { routePath } from 'hono/route';
import { secureHeaders } from 'hono/secure-headers';
import type { Logger } from 'pino';

import { createClientKeyResolver } from '@proxy/clientIp';
import type { ProxyConfig } from '@proxy/config';
import type { AppEnv } from '@proxy/env';
import { problem } from '@proxy/problem';
import { tokenRoutes, vehicleRoutes } from '@proxy/routes';
import { maskVin } from '@proxy/schemas';
import { createTokenService } from '@proxy/tokens';
import { createSkodaClient, FORWARDED_HEADERS, UpstreamUnavailableError } from '@proxy/upstream';

const CORS_MAX_AGE_SECONDS = 600;
/** No includeSubDomains: the proxy may share a domain with other sites (subpath deployment). */
const HSTS = 'max-age=31536000';

export const createApp = ({ config, logger }: { config: ProxyConfig; logger: Logger }) => {
  const tokens = createTokenService({ issuer: config.issuer, secrets: config.tokenSecrets });
  const skoda = createSkodaClient();
  const resolveClientKey = createClientKeyResolver(config.trustedProxies);

  const app = new Hono<AppEnv>();

  // Access log: route template (never the raw path) and the validated VIN masked; never headers or bodies
  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const vin = c.get('vin');
    logger.info(
      {
        method: c.req.method,
        route: routePath(c),
        vin: vin ? maskVin(vin) : undefined,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      },
      'request'
    );
  });

  app.use(secureHeaders({ strictTransportSecurity: HSTS }));
  app.use(
    cors({
      origin: config.allowedOrigins,
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Authorization', 'Content-Type'],
      exposeHeaders: [...FORWARDED_HEADERS],
      maxAge: CORS_MAX_AGE_SECONDS,
    })
  );
  app.use(async (c, next) => {
    c.set('clientKey', resolveClientKey(c.env?.incoming));
    await next();
    // Responses carry tokens and vehicle data: never store them in shared or browser caches
    c.header('Cache-Control', 'no-store');
  });

  app.get('/healthz', (c) => c.json({ status: 'ok' }));
  app.route('/v1/tokens', tokenRoutes({ tokens, skoda }));
  app.route('/v1/vehicles', vehicleRoutes({ tokens, skoda, cacheTtlSeconds: config.cacheTtlSeconds }));

  app.notFound((c) => problem(c, 404, 'not-found', 'Not found'));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const wwwAuthenticate = error.getResponse().headers.get('WWW-Authenticate');
      const headers: Record<string, string> = wwwAuthenticate ? { 'WWW-Authenticate': wwwAuthenticate } : {};
      switch (error.status) {
        case 401:
          return problem(c, 401, 'unauthorized', 'Missing or invalid token', headers);
        case 413:
          return problem(c, 413, 'payload-too-large', 'Request body too large');
        default:
          if (error.status < 500) return problem(c, error.status, 'invalid-request', 'Invalid request', headers);
      }
    }
    if (error instanceof UpstreamUnavailableError) {
      logger.warn({ cause: error.cause instanceof Error ? error.cause.name : undefined }, 'Škoda API request failed');
      return problem(c, 502, 'upstream-unavailable', 'Škoda API is unavailable');
    }
    logger.error({ err: { name: error.name, message: error.message, stack: error.stack } }, 'unhandled error');
    return problem(c, 500, 'internal-error', 'Internal error');
  });

  return app;
};
