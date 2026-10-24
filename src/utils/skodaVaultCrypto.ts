import { CompactEncrypt, compactDecrypt } from 'jose';

// Password-based encryption for Škoda tokens (RFC 7518 §4.8, PBES2 + AES-GCM).
// All cryptography is done by `jose` on top of the browser's Web Crypto API.

const ALG = 'PBES2-HS512+A256KW';
const ENC = 'A256GCM';

/** PBKDF2-HMAC-SHA512 iterations (OWASP 2023+ recommendation) */
export const VAULT_PBES2_ITERATIONS = 210_000;
export const VAULT_MIN_PASSWORD_LENGTH = 10;

/** Thrown when a JWE can't be decrypted: wrong password, tampered data or not a vault at all */
export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password');
    this.name = 'WrongPasswordError';
  }
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
