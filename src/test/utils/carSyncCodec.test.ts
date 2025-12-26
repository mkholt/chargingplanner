import { describe, it, expect } from 'vitest';
import {
  encodeSyncData,
  decodeSyncData,
  generateSyncCode,
  parseSyncCode,
  parseAnyFormat,
  detectInputFormat,
  mergeCars,
} from '@/utils/carSyncCodec';
import type { Car, PriceSettings } from '@/contexts';

describe('encodeSyncData / decodeSyncData', () => {
  describe('round-trip encoding/decoding', () => {
    it('preserves car data through encoding and decoding', () => {
      const cars: Car[] = [
        { id: '1', name: 'Tesla Model 3', batterySize: 60, maxPower: 11 },
        { id: '2', name: 'VW ID.4', batterySize: 77, maxPower: 11 },
      ];

      const encoded = encodeSyncData(cars);
      const decoded = decodeSyncData(encoded);

      expect(decoded.cars).toHaveLength(2);
      expect(decoded.cars[0]).toEqual({ name: 'Tesla Model 3', batterySize: 60, maxPower: 11 });
      expect(decoded.cars[1]).toEqual({ name: 'VW ID.4', batterySize: 77, maxPower: 11 });
    });

    it('preserves settings through encoding and decoding', () => {
      const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 50, maxPower: 7 }];
      const settings: PriceSettings = {
        postalCode: 8000,
        supplierId: 'supplier-1',
        companyId: 'company-1',
        productId: 'product-1',
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };

      const encoded = encodeSyncData(cars, settings);
      const decoded = decodeSyncData(encoded);

      expect(decoded.settings).toEqual(settings);
    });

    it('handles empty car list', () => {
      const cars: Car[] = [];
      const encoded = encodeSyncData(cars);
      const decoded = decodeSyncData(encoded);

      expect(decoded.cars).toHaveLength(0);
    });

    it('omits default settings values (DK1, 1h, mean)', () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      const settings: PriceSettings = {
        postalCode: null,
        supplierId: null,
        companyId: null,
        productId: null,
        priceArea: 'DK1',
        aggregationSize: '1h',
        aggregationMethod: 'mean',
      };

      const encoded = encodeSyncData(cars, settings);
      // Default values should result in no settings being encoded
      const decoded = decodeSyncData(encoded);
      // When decoded, settings with all defaults should be undefined or have defaults
      expect(decoded.settings).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws error for invalid base64', () => {
      expect(() => decodeSyncData('not-valid-base64!!!')).toThrow();
    });

    it('throws error for invalid JSON structure', () => {
      const invalidJson = btoa('not json');
      expect(() => decodeSyncData(invalidJson)).toThrow();
    });

    it('throws error for invalid car tuple structure', () => {
      const invalidData = btoa(JSON.stringify([[['name', 50]]])); // Missing maxPower
      expect(() => decodeSyncData(invalidData)).toThrow(/Invalid car/);
    });

    it('throws error for invalid car name', () => {
      const invalidData = btoa(JSON.stringify([[[123, 50, 7]]])); // Name is not string
      expect(() => decodeSyncData(invalidData)).toThrow(/Invalid car name/);
    });

    it('throws error for invalid battery size', () => {
      const invalidData = btoa(JSON.stringify([[['Car', 0, 7]]])); // Battery size <= 0
      expect(() => decodeSyncData(invalidData)).toThrow(/Invalid battery size/);
    });

    it('throws error for invalid max power', () => {
      const invalidData = btoa(JSON.stringify([[['Car', 50, -5]]])); // Max power <= 0
      expect(() => decodeSyncData(invalidData)).toThrow(/Invalid max power/);
    });
  });
});

describe('generateSyncCode / parseSyncCode', () => {
  it('generates code with EV: prefix', () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const code = generateSyncCode(cars);

    expect(code.startsWith('EV:')).toBe(true);
  });

  it('parses valid sync code', () => {
    const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 60, maxPower: 11 }];
    const code = generateSyncCode(cars);
    const parsed = parseSyncCode(code);

    expect(parsed).not.toBeNull();
    expect(parsed!.cars[0].name).toBe('Test Car');
  });

  it('returns null for code without EV: prefix', () => {
    const result = parseSyncCode('invalid-code');
    expect(result).toBeNull();
  });

  it('returns null for invalid data after prefix', () => {
    const result = parseSyncCode('EV:invalid-base64!!!');
    expect(result).toBeNull();
  });

  it('handles whitespace in code', () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const code = '  ' + generateSyncCode(cars) + '  ';
    const parsed = parseSyncCode(code);

    expect(parsed).not.toBeNull();
  });
});

describe('detectInputFormat', () => {
  it('detects URL format', () => {
    expect(detectInputFormat('https://example.com/#sync=abc')).toBe('url');
    expect(detectInputFormat('http://example.com/#sync=abc')).toBe('url');
  });

  it('detects sync code format', () => {
    expect(detectInputFormat('EV:abc123')).toBe('code');
  });

  it('detects raw base64 format', () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const encoded = encodeSyncData(cars);
    expect(detectInputFormat(encoded)).toBe('raw');
  });

  it('returns unknown for invalid input', () => {
    expect(detectInputFormat('random-invalid-text')).toBe('unknown');
  });
});

describe('parseAnyFormat', () => {
  const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 50, maxPower: 7 }];

  it('parses sync code format', () => {
    const code = generateSyncCode(cars);
    const result = parseAnyFormat(code);

    expect(result).not.toBeNull();
    expect(result!.cars[0].name).toBe('Test Car');
  });

  it('parses raw base64 format', () => {
    const encoded = encodeSyncData(cars);
    const result = parseAnyFormat(encoded);

    expect(result).not.toBeNull();
    expect(result!.cars[0].name).toBe('Test Car');
  });

  it('returns null for unknown format', () => {
    const result = parseAnyFormat('some random text');
    expect(result).toBeNull();
  });
});

describe('mergeCars', () => {
  const generateId = (() => {
    let counter = 0;
    return () => `new-${++counter}`;
  })();

  it('adds new cars with generated IDs', () => {
    const existing: Car[] = [{ id: '1', name: 'Existing Car', batterySize: 50, maxPower: 7 }];
    const imported: Omit<Car, 'id'>[] = [{ name: 'New Car', batterySize: 60, maxPower: 11 }];

    const result = mergeCars(existing, imported, generateId);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe('New Car');
    expect(result.added[0].id).toBe('new-1');
    expect(result.skipped).toHaveLength(0);
    expect(result.total).toBe(2);
  });

  it('skips duplicates based on case-insensitive name matching', () => {
    const existing: Car[] = [{ id: '1', name: 'Tesla Model 3', batterySize: 50, maxPower: 7 }];
    const imported: Omit<Car, 'id'>[] = [
      { name: 'TESLA MODEL 3', batterySize: 60, maxPower: 11 },
      { name: 'tesla model 3', batterySize: 70, maxPower: 22 },
    ];

    const result = mergeCars(existing, imported, generateId);

    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
  });

  it('handles mixed adds and skips', () => {
    const existing: Car[] = [{ id: '1', name: 'Car A', batterySize: 50, maxPower: 7 }];
    const imported: Omit<Car, 'id'>[] = [
      { name: 'Car A', batterySize: 60, maxPower: 11 }, // Skip - duplicate
      { name: 'Car B', batterySize: 70, maxPower: 22 }, // Add
      { name: 'Car C', batterySize: 80, maxPower: 50 }, // Add
    ];

    const result = mergeCars(existing, imported, generateId);

    expect(result.added).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it('handles empty existing cars', () => {
    const existing: Car[] = [];
    const imported: Omit<Car, 'id'>[] = [
      { name: 'Car A', batterySize: 50, maxPower: 7 },
      { name: 'Car B', batterySize: 60, maxPower: 11 },
    ];

    const result = mergeCars(existing, imported, generateId);

    expect(result.added).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('handles empty imported cars', () => {
    const existing: Car[] = [{ id: '1', name: 'Car A', batterySize: 50, maxPower: 7 }];
    const imported: Omit<Car, 'id'>[] = [];

    const result = mergeCars(existing, imported, generateId);

    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.total).toBe(1);
  });

  it('trims whitespace in name comparison', () => {
    const existing: Car[] = [{ id: '1', name: '  Car A  ', batterySize: 50, maxPower: 7 }];
    const imported: Omit<Car, 'id'>[] = [{ name: 'Car A', batterySize: 60, maxPower: 11 }];

    const result = mergeCars(existing, imported, generateId);

    expect(result.skipped).toHaveLength(1);
  });
});
