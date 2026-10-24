import { serve } from '@hono/node-server';

import { createApp } from '@proxy/app';
import { ConfigError, loadConfig, type ProxyConfig } from '@proxy/config';
import { createLogger } from '@proxy/logger';

const REQUEST_TIMEOUT_MS = 30_000;
const SHUTDOWN_GRACE_MS = 10_000;

let config: ProxyConfig;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`skoda-proxy: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

const logger = createLogger(config.logLevel);
const app = createApp({ config, logger });

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
    serverOptions: { requestTimeout: REQUEST_TIMEOUT_MS },
  },
  (info) => logger.info({ address: info.address, port: info.port }, 'skoda-proxy listening')
);

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
