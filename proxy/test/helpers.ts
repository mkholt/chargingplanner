import { randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Writable } from 'node:stream';

import { createApp } from '@proxy/app';
import type { ProxyConfig, TokenSecrets } from '@proxy/config';
import { createLogger } from '@proxy/logger';

export const makeSecrets = (kid = 'k1'): TokenSecrets => ({
  currentKid: kid,
  keys: new Map([[kid, new Uint8Array(randomBytes(32))]]),
});

export const makeConfig = (overrides: Partial<ProxyConfig> = {}): ProxyConfig => ({
  host: '127.0.0.1',
  port: 8080,
  issuer: 'skoda-proxy',
  trustedProxies: [],
  cacheTtlSeconds: 60,
  logLevel: 'info',
  tokenSecrets: makeSecrets(),
  ...overrides,
});

/** Minimal stand-in for the Node request that @hono/node-server provides as `c.env.incoming`. */
export const makeIncoming = (remoteAddress: string, forwardedFor?: string) =>
  ({
    socket: { remoteAddress },
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  }) as unknown as IncomingMessage;

export const createTestApp = (overrides: Partial<ProxyConfig> = {}) => {
  const logLines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      logLines.push(chunk.toString());
      callback();
    },
  });
  const app = createApp({ config: makeConfig(overrides), logger: createLogger('info', destination) });

  const request = (path: string, init: RequestInit = {}, remoteAddress = '203.0.113.10', forwardedFor?: string) =>
    app.request(path, init, { incoming: makeIncoming(remoteAddress, forwardedFor) });

  const issueToken = (body: unknown, remoteAddress?: string) =>
    request(
      '/v1/tokens',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      remoteAddress
    );

  const getVehicle = (vin: string, token?: string, query = '') =>
    request(`/v1/vehicles/${vin}${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  return { app, request, issueToken, getVehicle, logs: () => logLines.join('') };
};
