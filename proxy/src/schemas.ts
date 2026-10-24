import { z } from 'zod';

import type { components } from '@/types/skoda';

type VehiclePart = components['schemas']['VehiclePart'];

/** ISO 3779 VIN: 17 characters, letters I, O and Q are never used. */
export const VinSchema = z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN');

/**
 * The only parts of the vehicle data the proxy exposes.
 * Everything else (parking position, door status, ...) is never requested upstream.
 */
export const ALLOWED_VEHICLE_PARTS = ['info', 'charging'] as const satisfies readonly VehiclePart[];

/** `include` query parameter: comma-separated subset of ALLOWED_VEHICLE_PARTS. */
export const IncludeSchema = z
  .string()
  .transform((value) => [...new Set(value.split(',').map((part) => part.trim()))])
  .pipe(z.array(z.enum(ALLOWED_VEHICLE_PARTS)).min(1));

export const maskVin = (vin: string) => `…${vin.slice(-4)}`;
