import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import proxyaddr from 'proxy-addr';
import { z } from 'zod';

export type TokenSecrets = {
  currentKid: string;
  keys: Map<string, Uint8Array>;
};

export type ProxyConfig = {
  host: string;
  port: number;
  issuer: string;
  trustedProxies: string[];
  cacheTtlSeconds: number;
  logLevel: string;
  tokenSecrets: TokenSecrets;
};

export class ConfigError extends Error {}

const commaList = z
  .string()
  .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean));

const EnvSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  TOKEN_ISSUER: z.string().min(1).default('skoda-proxy'),
  TRUSTED_PROXIES: commaList.default([]).refine((proxies) => {
    try {
      proxyaddr.compile(proxies);
      return true;
    } catch {
      return false;
    }
  }, 'Must be addresses, CIDR ranges, or loopback / linklocal / uniquelocal'),
  // Bounds how long a revoked Škoda key can still read cached data
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(300).default(60),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TOKEN_SECRETS_FILE: z.string().min(1).optional(),
  CREDENTIALS_DIRECTORY: z.string().min(1).optional(),
});

/** 32 random bytes, standard base64 (e.g. `openssl rand -base64 32`). */
const SecretKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/, 'Each key must be 32 bytes, base64 encoded');

const SecretsFileSchema = z
  .object({
    current: z.string().min(1),
    keys: z.record(z.string().min(1), SecretKeySchema),
  })
  .refine((secrets) => secrets.current in secrets.keys, '"current" must name one of "keys"');

const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

const loadTokenSecrets = (path: string): TokenSecrets => {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new ConfigError(`Cannot read token secrets file ${path} as JSON`);
  }
  const parsed = SecretsFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ConfigError(`Invalid token secrets file: ${formatIssues(parsed.error)}`);
  }
  return {
    currentKid: parsed.data.current,
    keys: new Map(
      Object.entries(parsed.data.keys).map(([kid, key]) => [kid, new Uint8Array(Buffer.from(key, 'base64'))])
    ),
  };
};

/** Parses and validates configuration. Throws ConfigError; messages never include secret values. */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ProxyConfig => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(`Invalid environment: ${formatIssues(parsed.error)}`);
  }
  const vars = parsed.data;

  const secretsPath =
    vars.TOKEN_SECRETS_FILE ??
    (vars.CREDENTIALS_DIRECTORY ? join(vars.CREDENTIALS_DIRECTORY, 'token-secrets') : undefined);
  if (!secretsPath) {
    throw new ConfigError('Set TOKEN_SECRETS_FILE, or run under systemd with LoadCredential=token-secrets:…');
  }

  return {
    host: vars.HOST,
    port: vars.PORT,
    issuer: vars.TOKEN_ISSUER,
    trustedProxies: vars.TRUSTED_PROXIES,
    cacheTtlSeconds: vars.CACHE_TTL_SECONDS,
    logLevel: vars.LOG_LEVEL,
    tokenSecrets: loadTokenSecrets(secretsPath),
  };
};
