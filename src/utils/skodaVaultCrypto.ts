import { CompactEncrypt, compactDecrypt } from 'jose';

// Password-based encryption for Škoda tokens (RFC 7518 §4.8, PBES2 + AES-GCM).
// All cryptography is done by `jose` on top of the browser's Web Crypto API.

const ALG = 'PBES2-HS512+A256KW';
const ENC = 'A256GCM';

/** PBKDF2-HMAC-SHA512 iterations for user-chosen passwords (OWASP 2023+ recommendation) */
export const VAULT_PBES2_ITERATIONS = 210_000;
/**
 * Iterations for export codes. A random 120-bit code can't be guessed, so slow key derivation adds nothing.
 * This is jose's default limit, which also keeps crafted sync data from forcing expensive decryption.
 */
export const EXPORT_PBES2_ITERATIONS = 10_000;
export const VAULT_MIN_PASSWORD_LENGTH = 10;

/** Thrown when a JWE can't be decrypted: wrong password, tampered data or not a vault at all */
export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password');
    this.name = 'WrongPasswordError';
  }
}

/** Thrown when sealed Škoda access can't be opened with an export code, or belongs to another car */
export class WrongExportCodeError extends Error {
  constructor() {
    super('Wrong export code');
    this.name = 'WrongExportCodeError';
  }
}

/** Thrown when the vault must be unlocked first */
export class VaultLockedError extends Error {
  constructor() {
    super('The vault is locked');
    this.name = 'VaultLockedError';
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
export async function sealWithPassword(
  value: unknown,
  password: string,
  iterations = VAULT_PBES2_ITERATIONS,
): Promise<string> {
  return new CompactEncrypt(encoder.encode(JSON.stringify(value)))
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .setKeyManagementParameters({ p2c: iterations })
    .encrypt(encoder.encode(password));
}

/**
 * Decrypt a value sealed by `sealWithPassword`. Throws WrongPasswordError on any failure,
 * including a JWE that asks for more than `maxIterations`.
 */
export async function openWithPassword<T>(
  jwe: string,
  password: string,
  maxIterations = VAULT_PBES2_ITERATIONS,
): Promise<T> {
  try {
    const { plaintext } = await compactDecrypt(jwe, encoder.encode(password), {
      keyManagementAlgorithms: [ALG],
      contentEncryptionAlgorithms: [ENC],
      maxPBES2Count: maxIterations,
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
  return sealWithPassword(access, normalizeExportCode(exportCode), EXPORT_PBES2_ITERATIONS);
}

/**
 * Decrypt a car's Škoda token with an export code. The sealed access must belong to `vin`.
 * Throws WrongExportCodeError.
 */
export async function openAccess(sealed: string, exportCode: string, vin: string): Promise<string> {
  try {
    const opened = await openWithPassword<SealedAccess>(sealed, normalizeExportCode(exportCode), EXPORT_PBES2_ITERATIONS);
    if (opened.vin === vin && typeof opened.token === 'string' && opened.token) return opened.token;
  } catch {
    // Reported below, the same way as access for another car
  }
  throw new WrongExportCodeError();
}
