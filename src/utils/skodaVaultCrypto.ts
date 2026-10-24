import { CompactEncrypt, compactDecrypt } from 'jose';

// Password-based encryption for Škoda tokens (RFC 7518 §4.8, PBES2 + AES-GCM).
// All cryptography is done by `jose` on top of the browser's Web Crypto API.

const ALG = 'PBES2-HS512+A256KW';
const ENC = 'A256GCM';

/** PBKDF2-HMAC-SHA512 iterations (OWASP 2023+ recommendation) */
export const VAULT_PBES2_ITERATIONS = 210_000;
export const VAULT_MIN_PASSWORD_LENGTH = 10;

/** Which password a WrongPasswordError is about, when more than one was entered */
export type PasswordField = 'exportCode' | 'localPassword';

/** Thrown when a JWE can't be decrypted: wrong password, tampered data or not a vault at all */
export class WrongPasswordError extends Error {
  readonly field?: PasswordField;

  constructor(field?: PasswordField) {
    super('Wrong password');
    this.name = 'WrongPasswordError';
    this.field = field;
  }
}

/** Thrown when a new vault password is shorter than VAULT_MIN_PASSWORD_LENGTH */
export class PasswordTooShortError extends Error {
  constructor() {
    super(`Password must be at least ${VAULT_MIN_PASSWORD_LENGTH} characters`);
    this.name = 'PasswordTooShortError';
  }
}

export function assertPasswordLength(password: string): void {
  if (password.length < VAULT_MIN_PASSWORD_LENGTH) throw new PasswordTooShortError();
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Encrypt a JSON value with a password. A fresh random salt is generated for every call. */
export async function sealWithPassword(value: unknown, password: string): Promise<string> {
  return new CompactEncrypt(encoder.encode(JSON.stringify(value)))
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .setKeyManagementParameters({ p2c: VAULT_PBES2_ITERATIONS })
    .encrypt(encoder.encode(password));
}

/** Decrypt a value sealed by `sealWithPassword`. Throws WrongPasswordError on any failure. */
export async function openWithPassword<T>(jwe: string, password: string): Promise<T> {
  try {
    const { plaintext } = await compactDecrypt(jwe, encoder.encode(password), {
      keyManagementAlgorithms: [ALG],
      contentEncryptionAlgorithms: [ENC],
      // jose rejects more than 10,000 iterations by default as a DoS guard
      maxPBES2Count: VAULT_PBES2_ITERATIONS,
    });
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    throw new WrongPasswordError();
  }
}

// =============================================================================
// Export codes: one-time random passwords that seal Škoda access in sync data
// =============================================================================

/** Crockford base32: no I, L, O or U, so a code survives being read aloud or typed */
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 15 random bytes = 120 bits = 24 characters */
const EXPORT_CODE_BYTES = 15;
const EXPORT_CODE_GROUP = 4;

/** A new random export code, e.g. "7KQ2-M9XD-..." (6 groups of 4) */
export function generateExportCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(EXPORT_CODE_BYTES));
  let bits = 0;
  let value = 0;
  let code = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      code += CROCKFORD_ALPHABET[(value >>> bits) & 31];
    }
  }
  return formatExportCode(code);
}

/** The export code as typed: case, spaces and dashes don't matter, and I/L/O read as 1/1/0 */
export function normalizeExportCode(input: string): string {
  return formatExportCode(
    input
      .toUpperCase()
      .replace(/[\s-]/g, '')
      .replace(/[IL]/g, '1')
      .replace(/O/g, '0')
  );
}

function formatExportCode(code: string): string {
  return code.match(new RegExp(`.{1,${EXPORT_CODE_GROUP}}`, 'g'))?.join('-') ?? '';
}

/** Škoda access of one car as sealed into sync data */
type SealedAccess = { vin: string; token: string };

/** Encrypt a car's Škoda token with an export code */
export function sealAccess(access: SealedAccess, exportCode: string): Promise<string> {
  return sealWithPassword(access, normalizeExportCode(exportCode));
}

/**
 * Decrypt a car's Škoda token with an export code. The sealed access must belong to `vin`.
 * Throws WrongPasswordError('exportCode').
 */
export async function openAccess(sealed: string, exportCode: string, vin: string): Promise<string> {
  try {
    const opened = await openWithPassword<SealedAccess>(sealed, normalizeExportCode(exportCode));
    if (opened.vin !== vin || typeof opened.token !== 'string' || !opened.token) throw new WrongPasswordError();
    return opened.token;
  } catch {
    throw new WrongPasswordError('exportCode');
  }
}
