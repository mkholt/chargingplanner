import type { AggregationMethod, AggregationSize, Car, PriceSettings } from '@/hooks';

// =============================================================================
// Types
// =============================================================================

// Ultra-compact tuple format: [cars[], postalCode?, supplierId?, companyId?, productId?, aggSize?, aggMethod?]
type CarTuple = [string, number, number]; // [name, batterySize, maxPower]
type SyncTuple = [
  CarTuple[],  // cars
  number?,     // postalCode
  string?,     // supplierId
  string?,     // companyId
  string?,     // productId
  string?,     // aggregationSize ('15m' | '1h')
  string?,     // aggregationMethod ('mean' | 'min' | 'max')
];

export type SyncData = {
  cars: Omit<Car, 'id'>[];
  settings?: PriceSettings;
};

export type SyncInputFormat = 'url' | 'code' | 'raw' | 'unknown';

// =============================================================================
// URL-safe base64 encoding/decoding
// =============================================================================

function toUrlSafeBase64(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

// =============================================================================
// Validation
// =============================================================================

function validateCarTuple(item: unknown, index: number): Omit<Car, 'id'> {
  if (!Array.isArray(item) || item.length !== 3) {
    throw new Error(`Invalid car at index ${index}: expected [name, batterySize, maxPower]`);
  }

  const [name, batterySize, maxPower] = item;

  if (typeof name !== 'string' || !name.trim()) {
    throw new Error(`Invalid car name at index ${index}`);
  }
  if (typeof batterySize !== 'number' || batterySize <= 0) {
    throw new Error(`Invalid battery size at index ${index}`);
  }
  if (typeof maxPower !== 'number' || maxPower <= 0) {
    throw new Error(`Invalid max power at index ${index}`);
  }

  return {
    name: name.trim(),
    batterySize,
    maxPower,
  };
}

function isValidAggregationSize(value: unknown): value is AggregationSize {
  return value === '15m' || value === '1h';
}

function isValidAggregationMethod(value: unknown): value is AggregationMethod {
  return value === 'mean' || value === 'min' || value === 'max';
}

function validateSyncTuple(data: unknown): SyncData {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid sync data: expected non-empty array');
  }

  const [carTuples, postalCode, supplierId, companyId, productId, aggSize, aggMethod] = data as SyncTuple;

  if (!Array.isArray(carTuples)) {
    throw new Error('Invalid sync data: first element must be cars array');
  }

  const cars = carTuples.map((tuple, i) => validateCarTuple(tuple, i));

  // Build settings if any setting values are present
  const hasSettings = postalCode !== undefined ||
    supplierId !== undefined ||
    companyId !== undefined ||
    productId !== undefined ||
    aggSize !== undefined ||
    aggMethod !== undefined;

  const settings: PriceSettings | undefined = hasSettings ? {
    postalCode: typeof postalCode === 'number' ? postalCode : null,
    supplierId: typeof supplierId === 'string' ? supplierId : null,
    companyId: typeof companyId === 'string' ? companyId : null,
    productId: typeof productId === 'string' ? productId : null,
    aggregationSize: isValidAggregationSize(aggSize) ? aggSize : '1h',
    aggregationMethod: isValidAggregationMethod(aggMethod) ? aggMethod : 'mean',
  } : undefined;

  return { cars, settings };
}

// =============================================================================
// Encoding
// =============================================================================

export function encodeSyncData(cars: Car[], settings?: PriceSettings | null): string {
  const carTuples: CarTuple[] = cars.map(({ name, batterySize, maxPower }) =>
    [name, batterySize, maxPower]
  );

  const tuple: SyncTuple = [carTuples];

  // Add settings if present (in order, trailing undefined values omitted by JSON)
  if (settings) {
    if (settings.postalCode) tuple[1] = settings.postalCode;
    if (settings.supplierId) tuple[2] = settings.supplierId;
    if (settings.companyId) tuple[3] = settings.companyId;
    if (settings.productId) tuple[4] = settings.productId;
    // Only include non-default aggregation settings
    if (settings.aggregationSize && settings.aggregationSize !== '1h') {
      tuple[5] = settings.aggregationSize;
    }
    if (settings.aggregationMethod && settings.aggregationMethod !== 'mean') {
      tuple[6] = settings.aggregationMethod;
    }
  }

  return toUrlSafeBase64(JSON.stringify(tuple));
}

// =============================================================================
// Decoding
// =============================================================================

export function decodeSyncData(encoded: string): SyncData {
  try {
    const json = fromUrlSafeBase64(encoded);
    const data = JSON.parse(json);
    return validateSyncTuple(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to decode sync data: ${error.message}`);
    }
    throw new Error('Failed to decode sync data');
  }
}

// =============================================================================
// URL Generation & Parsing
// =============================================================================

const MAX_URL_LENGTH = 2000;

export function generateShareableUrl(cars: Car[], settings?: PriceSettings | null): string | null {
  const encoded = encodeSyncData(cars, settings);
  const baseUrl = window.location.origin + window.location.pathname;
  const url = `${baseUrl}#sync=${encoded}`;

  // Return null if URL is too long
  if (url.length > MAX_URL_LENGTH) {
    return null;
  }

  return url;
}

export function parseShareableUrl(url: string): SyncData | null {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash;

    if (!hash.startsWith('#sync=')) {
      return null;
    }

    const encoded = hash.slice(6); // Remove '#sync='
    return decodeSyncData(encoded);
  } catch {
    return null;
  }
}

// =============================================================================
// Sync Code Generation & Parsing
// =============================================================================

const SYNC_CODE_PREFIX = 'EV:';

export function generateSyncCode(cars: Car[], settings?: PriceSettings | null): string {
  return SYNC_CODE_PREFIX + encodeSyncData(cars, settings);
}

export function parseSyncCode(code: string): SyncData | null {
  const trimmed = code.trim();

  if (!trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return null;
  }

  try {
    const encoded = trimmed.slice(SYNC_CODE_PREFIX.length);
    return decodeSyncData(encoded);
  } catch {
    return null;
  }
}

// =============================================================================
// Auto-detect Format & Parse
// =============================================================================

export function detectInputFormat(input: string): SyncInputFormat {
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return 'url';
  }

  if (trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return 'code';
  }

  // Try parsing as raw base64
  try {
    decodeSyncData(trimmed);
    return 'raw';
  } catch {
    return 'unknown';
  }
}

export function parseAnyFormat(input: string): SyncData | null {
  const format = detectInputFormat(input);

  switch (format) {
    case 'url':
      return parseShareableUrl(input);
    case 'code':
      return parseSyncCode(input);
    case 'raw':
      try {
        return decodeSyncData(input.trim());
      } catch {
        return null;
      }
    default:
      return null;
  }
}

// =============================================================================
// Merge Logic
// =============================================================================

export type MergeResult = {
  added: Car[];
  skipped: Omit<Car, 'id'>[];
  total: number;
};

export function mergeCars(
  existing: Car[],
  imported: Omit<Car, 'id'>[],
  generateId: () => string
): MergeResult {
  const existingNames = new Set(
    existing.map(c => c.name.toLowerCase().trim())
  );

  const added: Car[] = [];
  const skipped: Omit<Car, 'id'>[] = [];

  for (const car of imported) {
    const normalizedName = car.name.toLowerCase().trim();

    if (existingNames.has(normalizedName)) {
      skipped.push(car);
    } else {
      existingNames.add(normalizedName);
      added.push({
        ...car,
        id: generateId(),
      });
    }
  }

  return {
    added,
    skipped,
    total: existing.length + added.length,
  };
}
