import type { Car } from '../hooks/useCars';

// URL-safe base64 encoding/decoding
function toUrlSafeBase64(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

// Validate car data structure (tuple format: [name, batterySize, maxPower])
function validateCarData(data: unknown): Omit<Car, 'id'>[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid data format: expected array');
  }

  return data.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3) {
      throw new Error(`Invalid car at index ${i}: expected [name, batterySize, maxPower]`);
    }

    const [name, batterySize, maxPower] = item;

    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`Invalid car name at index ${i}`);
    }
    if (typeof batterySize !== 'number' || batterySize <= 0) {
      throw new Error(`Invalid battery size at index ${i}`);
    }
    if (typeof maxPower !== 'number' || maxPower <= 0) {
      throw new Error(`Invalid max power at index ${i}`);
    }

    return {
      name: name.trim(),
      batterySize,
      maxPower,
    };
  });
}

// Encode cars to base64 (tuple format: [name, batterySize, maxPower])
export function encodeCars(cars: Car[]): string {
  const data = cars.map(({ name, batterySize, maxPower }) =>
    [name, batterySize, maxPower]
  );
  return toUrlSafeBase64(JSON.stringify(data));
}

// Decode base64 to cars (without IDs - caller must generate)
export function decodeCars(encoded: string): Omit<Car, 'id'>[] {
  try {
    const json = fromUrlSafeBase64(encoded);
    const data = JSON.parse(json);
    return validateCarData(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to decode car data: ${error.message}`);
    }
    throw new Error('Failed to decode car data');
  }
}

// Generate shareable URL with car data in hash
export function generateShareableUrl(cars: Car[]): string {
  const encoded = encodeCars(cars);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#sync=${encoded}`;
}

// Parse shareable URL and extract car data
export function parseShareableUrl(url: string): Omit<Car, 'id'>[] | null {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash;

    if (!hash.startsWith('#sync=')) {
      return null;
    }

    const encoded = hash.slice(6); // Remove '#sync='
    return decodeCars(encoded);
  } catch {
    return null;
  }
}

// Generate copy/paste sync code
const SYNC_CODE_PREFIX = 'EV:';

export function generateSyncCode(cars: Car[]): string {
  return SYNC_CODE_PREFIX + encodeCars(cars);
}

// Parse sync code
export function parseSyncCode(code: string): Omit<Car, 'id'>[] | null {
  const trimmed = code.trim();

  if (!trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return null;
  }

  try {
    const encoded = trimmed.slice(SYNC_CODE_PREFIX.length);
    return decodeCars(encoded);
  } catch {
    return null;
  }
}

// Auto-detect input format and parse
export type SyncInputFormat = 'url' | 'code' | 'raw' | 'unknown';

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
    decodeCars(trimmed);
    return 'raw';
  } catch {
    return 'unknown';
  }
}

export function parseAnyFormat(input: string): Omit<Car, 'id'>[] | null {
  const format = detectInputFormat(input);

  switch (format) {
    case 'url':
      return parseShareableUrl(input);
    case 'code':
      return parseSyncCode(input);
    case 'raw':
      try {
        return decodeCars(input.trim());
      } catch {
        return null;
      }
    default:
      return null;
  }
}

// Merge result type
export type MergeResult = {
  added: Car[];
  skipped: Omit<Car, 'id'>[];
  total: number;
};

// Merge imported cars with existing (skip duplicates by name)
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
