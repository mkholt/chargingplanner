import { EncryptJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { createTokenService, TOKEN_AUDIENCE } from '@proxy/tokens';

import { makeSecrets } from './helpers';
import { API_KEY, VIN } from './mocks/skodaApi';

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);

describe('token service', () => {
  const secrets = makeSecrets('k1');
  const service = createTokenService({ issuer: 'skoda-proxy', secrets });

  it('round-trips the claims', async () => {
    const token = await service.issue({ vin: VIN, key: API_KEY }, inOneHour());

    await expect(service.verify(token)).resolves.toEqual({ vin: VIN, key: API_KEY });
  });

  it('does not expose the API key in the token', async () => {
    const token = await service.issue({ vin: VIN, key: API_KEY }, inOneHour());
    const decoded = token
      .split('.')
      .map((part) => Buffer.from(part, 'base64url').toString('latin1'))
      .join('');

    expect(decoded).not.toContain(API_KEY);
    expect(decoded).not.toContain(VIN);
  });

  it('rejects a tampered token', async () => {
    const token = await service.issue({ vin: VIN, key: API_KEY }, inOneHour());
    const parts = token.split('.');
    const ciphertext = Buffer.from(parts[3], 'base64url');
    ciphertext[0] ^= 1;
    parts[3] = ciphertext.toString('base64url');

    await expect(service.verify(parts.join('.'))).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await service.issue({ vin: VIN, key: API_KEY }, new Date(Date.now() - 5 * 60 * 1000));

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects a token sealed with an unknown key id', async () => {
    const other = createTokenService({ issuer: 'skoda-proxy', secrets: makeSecrets('k9') });
    const token = await other.issue({ vin: VIN, key: API_KEY }, inOneHour());

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects a token sealed with a different key under the same key id', async () => {
    const other = createTokenService({ issuer: 'skoda-proxy', secrets: makeSecrets('k1') });
    const token = await other.issue({ vin: VIN, key: API_KEY }, inOneHour());

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('accepts tokens sealed with a previous key after rotation', async () => {
    const token = await service.issue({ vin: VIN, key: API_KEY }, inOneHour());
    const rotated = createTokenService({
      issuer: 'skoda-proxy',
      secrets: { currentKid: 'k2', keys: new Map([...secrets.keys, ['k2', makeSecrets('k2').keys.get('k2')!]]) },
    });

    await expect(rotated.verify(token)).resolves.toEqual({ vin: VIN, key: API_KEY });
  });

  it.each([
    ['wrong audience', { aud: 'something-else', iss: 'skoda-proxy' }],
    ['wrong issuer', { aud: TOKEN_AUDIENCE, iss: 'someone-else' }],
  ])('rejects a token with %s', async (_, { aud, iss }) => {
    const token = await new EncryptJWT({ vin: VIN, key: API_KEY })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', kid: 'k1' })
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(inOneHour())
      .encrypt(secrets.keys.get('k1')!);

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects a token without the expected claims', async () => {
    const token = await new EncryptJWT({ vin: 'not-a-vin', key: API_KEY })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', kid: 'k1' })
      .setIssuer('skoda-proxy')
      .setAudience(TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(inOneHour())
      .encrypt(secrets.keys.get('k1')!);

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('refuses to start without the current secret', () => {
    expect(() =>
      createTokenService({ issuer: 'skoda-proxy', secrets: { currentKid: 'k2', keys: secrets.keys } })
    ).toThrow(/k2/);
  });

  it.each([['garbage'], ['a.b.c.d.e'], ['x'.repeat(5000)]])('rejects malformed input %#', async (token) => {
    await expect(service.verify(token)).resolves.toBeNull();
  });
});
