import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '@proxy/config';

const KEY = Buffer.alloc(32, 7).toString('base64');

const writeSecrets = (content: unknown, name = 'token-secrets') => {
  const dir = mkdtempSync(join(tmpdir(), 'skoda-proxy-'));
  const path = join(dir, name);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  return { dir, path };
};

const baseEnv = (secretsPath: string) => ({
  TOKEN_SECRETS_FILE: secretsPath,
});

describe('loadConfig', () => {
  it('applies defaults and decodes secrets', () => {
    const { path } = writeSecrets({ current: 'k1', keys: { k1: KEY } });

    const config = loadConfig(baseEnv(path));

    expect(config).toMatchObject({
      host: '127.0.0.1',
      port: 8080,
      issuer: 'skoda-proxy',
      trustedProxies: [],
      cacheTtlSeconds: 60,
      logLevel: 'info',
    });
    expect(config.tokenSecrets.currentKid).toBe('k1');
    expect(config.tokenSecrets.keys.get('k1')).toHaveLength(32);
  });

  it('parses a comma separated list', () => {
    const { path } = writeSecrets({ current: 'k1', keys: { k1: KEY } });

    const config = loadConfig({
      ...baseEnv(path),
      TRUSTED_PROXIES: 'loopback, 10.0.0.0/8',
    });

    expect(config.trustedProxies).toEqual(['loopback', '10.0.0.0/8']);
  });

  it('reads secrets from the systemd credentials directory', () => {
    const { dir } = writeSecrets({ current: 'k1', keys: { k1: KEY } });

    const config = loadConfig({ CREDENTIALS_DIRECTORY: dir });

    expect(config.tokenSecrets.currentKid).toBe('k1');
  });

  it.each([
    ['TRUSTED_PROXIES with an invalid address', { TRUSTED_PROXIES: 'loopback, not-an-ip' }],
    ['CACHE_TTL_SECONDS above 300', { CACHE_TTL_SECONDS: '301' }],
  ])('rejects %s', (_, env) => {
    const { path } = writeSecrets({ current: 'k1', keys: { k1: KEY } });

    expect(() => loadConfig({ ...baseEnv(path), ...env })).toThrow(ConfigError);
  });

  it('requires a secrets file', () => {
    expect(() => loadConfig({})).toThrow(/TOKEN_SECRETS_FILE/);
  });

  it.each([
    ['not JSON', 'not json'],
    ['current not in keys', { current: 'k2', keys: { k1: KEY } }],
    ['short key', { current: 'k1', keys: { k1: Buffer.alloc(16).toString('base64') } }],
  ])('rejects a secrets file that is %s', (_, content) => {
    const { path } = writeSecrets(content);

    expect(() => loadConfig(baseEnv(path))).toThrow(ConfigError);
  });

  it('never includes secret values in errors', () => {
    const badKey = 'c2VjcmV0LXZhbHVlLXRoYXQtaXMtdG9vLXNob3J0';
    const { path } = writeSecrets({ current: 'k1', keys: { k1: badKey } });

    expect(() => loadConfig(baseEnv(path))).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(badKey) })
    );
  });
});
