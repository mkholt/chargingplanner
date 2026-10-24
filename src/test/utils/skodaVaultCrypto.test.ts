import { decodeProtectedHeader } from 'jose';

import {
  generateExportCode,
  normalizeExportCode,
  openAccess,
  openWithPassword,
  sealAccess,
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

describe('export codes', () => {
  const VIN = 'TMBJJ7NE8L0123456';
  const CODE_FORMAT = /^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/;

  it('generates a new code of 6 groups each time', () => {
    const code = generateExportCode();

    expect(code).toMatch(CODE_FORMAT);
    expect(generateExportCode()).not.toBe(code);
  });

  it('ignores case, spaces and dashes, and reads I, L and O as digits', () => {
    expect(normalizeExportCode(' abcd efgh-ijkl mnop-qrst vwxy ')).toBe('ABCD-EFGH-1JK1-MN0P-QRST-VWXY');
  });

  it('opens sealed access with the code as typed', async () => {
    const code = generateExportCode();
    const sealed = await sealAccess({ vin: VIN, token: 'secret-token' }, code);

    expect(sealed).not.toContain('secret-token');
    await expect(openAccess(sealed, code.toLowerCase().replace(/-/g, ' '), VIN)).resolves.toBe('secret-token');
  });

  it.each([
    ['a wrong code', generateExportCode(), VIN],
    ['another VIN', undefined, 'TMBJJ7NE8L0999999'],
  ])('rejects %s as a wrong export code', async (_label, typedCode, vin) => {
    const code = generateExportCode();
    const sealed = await sealAccess({ vin: VIN, token: 'secret-token' }, code);

    const error = await openAccess(sealed, typedCode ?? code, vin).catch(e => e);

    expect(error).toBeInstanceOf(WrongPasswordError);
    expect(error.field).toBe('exportCode');
  });
});
