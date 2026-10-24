import { decodeProtectedHeader } from 'jose';

import {
  openWithPassword,
  sealWithPassword,
  VAULT_PBES2_ITERATIONS,
  WrongPasswordError,
} from '@/utils';

const PASSWORD = 'correct horse battery';
const TOKENS = { car1: { vin: 'TMBJJ7NE8L0123456', token: 'secret-token' } };

describe('skodaVaultCrypto', () => {
  it('round-trips a value through password encryption', async () => {
    const jwe = await sealWithPassword(TOKENS, PASSWORD);

    expect(jwe).not.toContain('secret-token');
    await expect(openWithPassword(jwe, PASSWORD)).resolves.toEqual(TOKENS);
  });

  it('uses PBES2 with the configured iteration count and a fresh salt per encryption', async () => {
    const first = await sealWithPassword(TOKENS, PASSWORD);
    const second = await sealWithPassword(TOKENS, PASSWORD);

    const header = decodeProtectedHeader(first);
    expect(header).toMatchObject({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2c: VAULT_PBES2_ITERATIONS });
    expect(header.p2s).not.toEqual(decodeProtectedHeader(second).p2s);
  });

  it('rejects a wrong password', async () => {
    const jwe = await sealWithPassword(TOKENS, PASSWORD);

    await expect(openWithPassword(jwe, 'wrong password!')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('rejects a tampered vault', async () => {
    const jwe = await sealWithPassword(TOKENS, PASSWORD);
    const parts = jwe.split('.');
    const ciphertext = parts[3];
    parts[3] = (ciphertext[0] === 'A' ? 'B' : 'A') + ciphertext.slice(1);

    await expect(openWithPassword(parts.join('.'), PASSWORD)).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('rejects garbage input', async () => {
    await expect(openWithPassword('not-a-jwe', PASSWORD)).rejects.toBeInstanceOf(WrongPasswordError);
  });
});
