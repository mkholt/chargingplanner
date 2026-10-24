import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import type { Logger } from 'pino';

import { createClientIpResolver } from '@proxy/clientIp';
import type { ProxyConfig } from '@proxy/config';
import type { AppEnv } from '@proxy/env';
import { problem } from '@proxy/problem';
import { healthRoutes, tokenRoutes, vehicleRoutes } from '@proxy/routes';
import { maskVin } from '@proxy/schemas';
import { createTokenService } from '@proxy/tokens';
import { createSkodaClient, FORWARDED_HEADERS, UpstreamUnavailableError } from '@proxy/upstream';

const VIN_IN_PATH = /\/([A-HJ-NPR-Z0-9]{17})(?=\/|$)/;
const CORS_MAX_AGE_SECONDS = 600;

export const createApp = ({ config, logger }: { config: ProxyConfig; logger: Logger }) => {
  const tokens = createTokenService({ issuer: config.issuer, secrets: config.tokenSecrets });
  const skoda = createSkodaClient();
  const resolveClientIp = createClientIpResolver(config.trustedProxies);

  const app = new Hono<AppEnv>();

  // Access log: route template and masked VIN only; never headers or bodies
  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const vin = VIN_IN_PATH.exec(c.req.path)?.[1];
    logger.info(
      {
        method: c.req.method,
        path: c.req.path.replace(VIN_IN_PATH, '/:vin'),
        vin: vin ? maskVin(vin) : undefined,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
        upstreamTraceId: c.get('upstreamTraceId'),
      },
      'request'
    );
  });

  app.use(secureHeaders());
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
    c.set('clientIp', resolveClientIp(c.env?.incoming));
    await next();
    // Responses carry tokens and vehicle data: never store them in shared or browser caches
    c.header('Cache-Control', 'no-store');
  });

  app.route('/', healthRoutes());
  app.route('/v1/tokens', tokenRoutes({ tokens, skoda }));
  app.route('/v1/vehicles', vehicleRoutes({ tokens, skoda, cacheTtlSeconds: config.cacheTtlSeconds }));

  app.notFound((c) => problem(c, 404, 'not-found', 'Not found'));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const res = error.getResponse();
      const wwwAuthenticate = res.headers.get('WWW-Authenticate');
      const headers: Record<string, string> = wwwAuthenticate ? { 'WWW-Authenticate': wwwAuthenticate } : {};
      switch (res.status) {
        case 400:
          return problem(c, 400, 'invalid-request', 'Invalid request', headers);
        case 401:
          return problem(c, 401, 'unauthorized', 'Missing or invalid token', headers);
        case 413:
          return problem(c, 413, 'payload-too-large', 'Request body too large');
      }
    }
    if (error instanceof UpstreamUnavailableError) {
      logger.warn({ cause: (error.cause as Error | undefined)?.name }, 'Škoda API request failed');
      return problem(c, 502, 'upstream-unavailable', 'Škoda API is unavailable');
    }
    logger.error({ err: { name: error.name, message: error.message, stack: error.stack } }, 'unhandled error');
    return problem(c, 500, 'internal-error', 'Internal error');
  });

  return app;
};
