import { pino, type DestinationStream, type Logger } from 'pino';

/**
 * Secrets are never passed to the logger on purpose; redaction is a second line of defence.
 */
const REDACTED_PATHS = [
  'apiKey',
  'key',
  'token',
  'authorization',
  '*.apiKey',
  '*.key',
  '*.token',
  '*.authorization',
  'headers["x-api-key"]',
  '*.headers.authorization',
  '*.headers["x-api-key"]',
];

export const createLogger = (level: string, destination?: DestinationStream): Logger =>
  pino({ level, redact: { paths: REDACTED_PATHS, censor: '[redacted]' } }, destination);
