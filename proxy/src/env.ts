import type { IncomingMessage } from 'node:http';

import type { RateLimitInfo } from 'hono-rate-limiter';

import type { VehicleTokenClaims } from '@proxy/tokens';

export type AppEnv = {
  Bindings: {
    /** Set by @hono/node-server; absent when the app is invoked directly (tests). */
    incoming?: IncomingMessage;
  };
  Variables: {
    clientIp: string;
    vehicleToken: VehicleTokenClaims;
    upstreamTraceId: string | undefined;
    rateLimit: RateLimitInfo;
  };
};
