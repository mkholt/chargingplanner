import { EncryptJWT, errors, jwtDecrypt, type JWTDecryptGetKey } from 'jose';
import { z } from 'zod';

import type { TokenSecrets } from '@proxy/config';
import { VinSchema } from '@proxy/schemas';

/** Audience for vehicle tokens; tokens minted for anything else are never accepted. */
export const TOKEN_AUDIENCE = 'skoda-proxy:vehicle';
const CLOCK_TOLERANCE_SECONDS = 60;
/** JWE compact tokens for this payload are ~400 chars; anything far larger is not ours. */
const MAX_TOKEN_LENGTH = 4096;

const VehicleTokenClaimsSchema = z.object({
  vin: VinSchema,
  key: z.string().min(1),
});

export type VehicleTokenClaims = z.infer<typeof VehicleTokenClaimsSchema>;

export type TokenService = {
  issue: (claims: VehicleTokenClaims, expiresAt: Date) => Promise<string>;
  /** Returns the claims, or null for any token that is malformed, tampered, expired or not ours. */
  verify: (token: string) => Promise<VehicleTokenClaims | null>;
};

/**
 * Vehicle tokens are JWTs encrypted as JWE (RFC 7516) with "dir" + "A256GCM".
 * The browser can store and present them but cannot read the Škoda API key inside.
 */
export const createTokenService = ({
  issuer,
  secrets,
}: {
  issuer: string;
  secrets: TokenSecrets;
}): TokenService => {
  const currentKey = secrets.keys.get(secrets.currentKid);
  if (!currentKey) throw new Error(`Current token secret "${secrets.currentKid}" is missing`);

  const getKey: JWTDecryptGetKey = ({ kid }) => {
    const key = kid ? secrets.keys.get(kid) : undefined;
    if (!key) throw new errors.JWEDecryptionFailed('Unknown key id');
    return key;
  };

  return {
    issue: (claims, expiresAt) =>
      new EncryptJWT(claims)
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', kid: secrets.currentKid })
        .setIssuer(issuer)
        .setAudience(TOKEN_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(expiresAt)
        .encrypt(currentKey),

    verify: async (token) => {
      if (token.length > MAX_TOKEN_LENGTH) return null;
      try {
        const { payload } = await jwtDecrypt(token, getKey, {
          issuer,
          audience: TOKEN_AUDIENCE,
          requiredClaims: ['exp', 'iat'],
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
          keyManagementAlgorithms: ['dir'],
          contentEncryptionAlgorithms: ['A256GCM'],
        });
        const claims = VehicleTokenClaimsSchema.safeParse(payload);
        return claims.success ? claims.data : null;
      } catch (error) {
        if (error instanceof errors.JOSEError) return null;
        throw error;
      }
    },
  };
};
