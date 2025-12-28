import { type Car, type PriceSettings } from '@/contexts';
import type { Product } from '@/data';

// =============================================================================
// Types
// =============================================================================

/**
 * Sync data format.
 * Settings uses full cached objects for immediate display on import.
 * Location is intentionally excluded for privacy.
 */
export type SyncData = {
  cars: Omit<Car, 'id'>[];
  /** Settings with location always null (not synced for privacy) */
  settings?: Omit<PriceSettings, 'location'> & { location: null };
};

export type SyncInputFormat = 'url' | 'code' | 'raw' | 'unknown';

// =============================================================================
// Compression (using browser Compression Streams API)
// =============================================================================

async function compress(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });

  const compressedStream = inputStream.pipeThrough(new CompressionStream('deflate-raw'));
  const reader = compressedStream.getReader();

  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function decompress(data: Uint8Array): Promise<string> {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  const decompressedStream = inputStream.pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = decompressedStream.getReader();
  const decoder = new TextDecoder();

  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();

  return result;
}

// =============================================================================
// URL-safe Base64 encoding/decoding (for binary data)
// =============================================================================

function toUrlSafeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Validation
// =============================================================================

function validateCar(car: unknown, index: number): Omit<Car, 'id'> {
  if (typeof car !== 'object' || car === null) {
    throw new Error(`Invalid car at index ${index}: expected object`);
  }

  const { name, batterySize, maxPower } = car as Record<string, unknown>;

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

function validateSupplier(supplier: unknown): PriceSettings['supplier'] {
  if (supplier === null || supplier === undefined) {
    return null;
  }

  if (typeof supplier !== 'object') {
    throw new Error('Invalid settings: supplier must be an object');
  }

  const s = supplier as Record<string, unknown>;

  if (typeof s.id !== 'string' || !s.id) {
    throw new Error('Invalid settings: supplier.id must be a non-empty string');
  }
  if (typeof s.name !== 'string' || !s.name) {
    throw new Error('Invalid settings: supplier.name must be a non-empty string');
  }
  if (typeof s.companyName !== 'string' || !s.companyName) {
    throw new Error('Invalid settings: supplier.companyName must be a non-empty string');
  }

  const validPriceAreas = ['DK1', 'DK2'];
  if (!validPriceAreas.includes(s.priceArea as string)) {
    throw new Error('Invalid settings: supplier.priceArea must be DK1 or DK2');
  }

  return {
    id: s.id,
    name: s.name,
    companyName: s.companyName,
    priceArea: s.priceArea as 'DK1' | 'DK2',
  };
}

function validateProduct(product: unknown): Product | null {
  if (product === null || product === undefined) {
    return null;
  }

  if (typeof product !== 'object') {
    throw new Error('Invalid settings: product must be an object');
  }

  const p = product as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id) {
    throw new Error('Invalid settings: product.id must be a non-empty string');
  }
  if (typeof p.name !== 'string' || !p.name) {
    throw new Error('Invalid settings: product.name must be a non-empty string');
  }
  if (typeof p.surcharge !== 'number') {
    throw new Error('Invalid settings: product.surcharge must be a number');
  }
  if (typeof p.subscriptionMonthly !== 'number') {
    throw new Error('Invalid settings: product.subscriptionMonthly must be a number');
  }
  if (typeof p.isGreen !== 'boolean') {
    throw new Error('Invalid settings: product.isGreen must be a boolean');
  }

  return {
    id: p.id,
    name: p.name,
    surcharge: p.surcharge,
    subscriptionMonthly: p.subscriptionMonthly,
    isGreen: p.isGreen,
  };
}

function validateCompany(company: unknown): PriceSettings['company'] {
  if (company === null || company === undefined) {
    return null;
  }

  if (typeof company !== 'object') {
    throw new Error('Invalid settings: company must be an object');
  }

  const c = company as Record<string, unknown>;

  if (typeof c.id !== 'string' || !c.id) {
    throw new Error('Invalid settings: company.id must be a non-empty string');
  }
  if (typeof c.name !== 'string' || !c.name) {
    throw new Error('Invalid settings: company.name must be a non-empty string');
  }

  return {
    id: c.id,
    name: c.name,
    product: validateProduct(c.product),
  };
}

function validateSettings(settings: unknown): SyncData['settings'] {
  if (settings === undefined || settings === null) {
    return undefined;
  }

  if (typeof settings !== 'object') {
    throw new Error('Invalid settings: expected object');
  }

  const s = settings as Record<string, unknown>;

  // Validate enums
  const validPriceAreas = ['DK1', 'DK2'];
  const validAggSizes = ['15m', '1h'];
  const validAggMethods = ['mean', 'min', 'max'];

  if (s.priceArea !== null && s.priceArea !== undefined && !validPriceAreas.includes(s.priceArea as string)) {
    throw new Error('Invalid settings: priceArea must be DK1 or DK2');
  }
  if (s.aggregationSize !== undefined && !validAggSizes.includes(s.aggregationSize as string)) {
    throw new Error('Invalid settings: aggregationSize must be 15m or 1h');
  }
  if (s.aggregationMethod !== undefined && !validAggMethods.includes(s.aggregationMethod as string)) {
    throw new Error('Invalid settings: aggregationMethod must be mean, min, or max');
  }

  // Validate and return settings with full cached objects
  // Location is always null for privacy
  return {
    location: null,
    supplier: validateSupplier(s.supplier),
    company: validateCompany(s.company),
    priceArea: (s.priceArea as PriceSettings['priceArea']) ?? 'DK1',
    aggregationSize: (s.aggregationSize as PriceSettings['aggregationSize']) ?? '1h',
    aggregationMethod: (s.aggregationMethod as PriceSettings['aggregationMethod']) ?? 'mean',
  };
}

function validateSyncData(data: unknown): SyncData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid sync data: expected object');
  }

  const { cars, settings } = data as Record<string, unknown>;

  if (!Array.isArray(cars)) {
    throw new Error('Invalid sync data: cars must be an array');
  }

  return {
    cars: cars.map((car, i) => validateCar(car, i)),
    settings: validateSettings(settings),
  };
}

// =============================================================================
// Encoding
// =============================================================================

export async function encodeSyncData(cars: Car[], settings?: PriceSettings | null): Promise<string> {
  const data: SyncData = {
    cars: cars.map(({ name, batterySize, maxPower }) => ({ name, batterySize, maxPower })),
  };

  // Only include settings if there are meaningful values
  // Note: Location is NOT synced for privacy reasons
  if (settings && (settings.supplier || settings.company)) {
    data.settings = {
      location: null, // Never sync location for privacy
      supplier: settings.supplier,
      company: settings.company,
      priceArea: settings.priceArea ?? 'DK1',
      aggregationSize: settings.aggregationSize,
      aggregationMethod: settings.aggregationMethod,
    };
  }

  const json = JSON.stringify(data);
  const compressed = await compress(json);
  return toUrlSafeBase64(compressed);
}

// =============================================================================
// Decoding
// =============================================================================

export async function decodeSyncData(encoded: string): Promise<SyncData> {
  try {
    const compressed = fromUrlSafeBase64(encoded);
    const json = await decompress(compressed);
    const data = JSON.parse(json);
    return validateSyncData(data);
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

export async function generateShareableUrl(cars: Car[], settings?: PriceSettings | null): Promise<string | null> {
  const encoded = await encodeSyncData(cars, settings);
  const baseUrl = window.location.origin + window.location.pathname;
  const url = `${baseUrl}#sync=${encoded}`;

  if (url.length > MAX_URL_LENGTH) {
    return null;
  }

  return url;
}

export async function parseShareableUrl(url: string): Promise<SyncData | null> {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash;

    if (!hash.startsWith('#sync=')) {
      return null;
    }

    const encoded = hash.slice(6);
    return await decodeSyncData(encoded);
  } catch {
    return null;
  }
}

// =============================================================================
// Sync Code Generation & Parsing
// =============================================================================

const SYNC_CODE_PREFIX = 'EV:';

export async function generateSyncCode(cars: Car[], settings?: PriceSettings | null): Promise<string> {
  const encoded = await encodeSyncData(cars, settings);
  return SYNC_CODE_PREFIX + encoded;
}

export async function parseSyncCode(code: string): Promise<SyncData | null> {
  const trimmed = code.trim();

  if (!trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return null;
  }

  try {
    const encoded = trimmed.slice(SYNC_CODE_PREFIX.length);
    return await decodeSyncData(encoded);
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

  // Assume raw base64 if it looks like valid base64
  if (/^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length > 10) {
    return 'raw';
  }

  return 'unknown';
}

export async function parseAnyFormat(input: string): Promise<SyncData | null> {
  const format = detectInputFormat(input);

  switch (format) {
    case 'url':
      return parseShareableUrl(input);
    case 'code':
      return parseSyncCode(input);
    case 'raw':
      try {
        return await decodeSyncData(input.trim());
      } catch {
        return null;
      }
    default:
      return null;
  }
}

// =============================================================================
// Merge Logic (unchanged - still synchronous)
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
