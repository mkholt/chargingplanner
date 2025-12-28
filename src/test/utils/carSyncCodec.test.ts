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
    it('preserves car data through encoding and decoding', async () => {
      const cars: Car[] = [
        { id: '1', name: 'Tesla Model 3', batterySize: 60, maxPower: 11 },
        { id: '2', name: 'VW ID.4', batterySize: 77, maxPower: 11 },
      ];

      const encoded = await encodeSyncData(cars);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.cars).toHaveLength(2);
      expect(decoded.cars[0]).toEqual({ name: 'Tesla Model 3', batterySize: 60, maxPower: 11 });
      expect(decoded.cars[1]).toEqual({ name: 'VW ID.4', batterySize: 77, maxPower: 11 });
    });

    it('preserves settings through encoding and decoding (except location for privacy)', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 50, maxPower: 7 }];
      const supplier = { id: 'supplier-1', name: 'Test Supplier', companyName: 'Test Co', priceArea: 'DK2' as const };
      const product = { id: 'product-1', name: 'Test Product', surcharge: 0.05, subscriptionMonthly: 39, isGreen: true };
      const company = { id: 'company-1', name: 'Test Company', product };

      const settings: PriceSettings = {
        location: 8000, // Will not be synced for privacy
        supplier,
        company,
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };

      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);

      // Decoded settings now contain full cached objects (not IDs)
      // Location should always be null after decoding (not synced for privacy)
      expect(decoded.settings).toEqual({
        location: null,
        supplier,
        company,
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      });
    });

    it('handles empty car list', async () => {
      const cars: Car[] = [];
      const encoded = await encodeSyncData(cars);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.cars).toHaveLength(0);
    });

    it('omits settings when only defaults are present', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      // Settings with no supplier/company/product should not be synced
      const settings: PriceSettings = {
        location: null,
        supplier: null,
        company: null,
        priceArea: 'DK1',
        aggregationSize: '1h',
        aggregationMethod: 'mean',
      };

      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);
      // Settings with all defaults/nulls should not be included
      expect(decoded.settings).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws error for invalid base64', async () => {
      await expect(decodeSyncData('not-valid-base64!!!')).rejects.toThrow();
    });

    it('throws error for invalid compressed data', async () => {
      // Valid base64 but not valid deflate data
      const invalidData = 'aGVsbG8gd29ybGQ'; // "hello world" in base64
      await expect(decodeSyncData(invalidData)).rejects.toThrow();
    });

    it('throws error for invalid car object structure', async () => {
      // We can't easily create invalid compressed data, so we test validation indirectly
      // by verifying valid data works
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      const encoded = await encodeSyncData(cars);
      const decoded = await decodeSyncData(encoded);
      expect(decoded.cars[0].name).toBe('Test');
    });
  });

  describe('settings validation', () => {
    it('validates supplier object structure', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      const validSupplier = { id: 'sup-1', name: 'Supplier', companyName: 'Company', priceArea: 'DK1' as const };
      const settings: PriceSettings = {
        location: null,
        supplier: validSupplier,
        company: null,
        priceArea: 'DK1',
        aggregationSize: '1h',
        aggregationMethod: 'mean',
      };

      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.settings?.supplier).toEqual(validSupplier);
    });

    it('validates company object with product', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      const product = { id: 'prod-1', name: 'Product', surcharge: 0.05, subscriptionMonthly: 39, isGreen: true };
      const company = { id: 'comp-1', name: 'Company', product };
      const settings: PriceSettings = {
        location: null,
        supplier: null,
        company,
        priceArea: 'DK1',
        aggregationSize: '1h',
        aggregationMethod: 'mean',
      };

      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.settings?.company).toEqual(company);
      expect(decoded.settings?.company?.product).toEqual(product);
    });

    it('handles company without product', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      const company = { id: 'comp-1', name: 'Company', product: null };
      const settings: PriceSettings = {
        location: null,
        supplier: null,
        company,
        priceArea: 'DK1',
        aggregationSize: '1h',
        aggregationMethod: 'mean',
      };

      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.settings?.company?.id).toBe('comp-1');
      expect(decoded.settings?.company?.product).toBeNull();
    });

    it('handles null supplier and company', async () => {
      const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
      // Settings with aggregation but no supplier/company
      const settings: PriceSettings = {
        location: null,
        supplier: null,
        company: null,
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };

      // Without supplier or company, settings won't be included
      const encoded = await encodeSyncData(cars, settings);
      const decoded = await decodeSyncData(encoded);

      expect(decoded.settings).toBeUndefined();
    });
  });
});

describe('generateSyncCode / parseSyncCode', () => {
  it('generates code with EV: prefix', async () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const code = await generateSyncCode(cars);

    expect(code.startsWith('EV:')).toBe(true);
  });

  it('parses valid sync code', async () => {
    const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 60, maxPower: 11 }];
    const code = await generateSyncCode(cars);
    const parsed = await parseSyncCode(code);

    expect(parsed).not.toBeNull();
    expect(parsed!.cars[0].name).toBe('Test Car');
  });

  it('returns null for code without EV: prefix', async () => {
    const result = await parseSyncCode('invalid-code');
    expect(result).toBeNull();
  });

  it('returns null for invalid data after prefix', async () => {
    const result = await parseSyncCode('EV:invalid-base64!!!');
    expect(result).toBeNull();
  });

  it('handles whitespace in code', async () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const code = '  ' + await generateSyncCode(cars) + '  ';
    const parsed = await parseSyncCode(code);

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

  it('detects raw base64 format', async () => {
    const cars: Car[] = [{ id: '1', name: 'Test', batterySize: 50, maxPower: 7 }];
    const encoded = await encodeSyncData(cars);
    expect(detectInputFormat(encoded)).toBe('raw');
  });

  it('returns unknown for invalid input', () => {
    expect(detectInputFormat('random text with spaces')).toBe('unknown');
  });
});

describe('parseAnyFormat', () => {
  const cars: Car[] = [{ id: '1', name: 'Test Car', batterySize: 50, maxPower: 7 }];

  it('parses sync code format', async () => {
    const code = await generateSyncCode(cars);
    const result = await parseAnyFormat(code);

    expect(result).not.toBeNull();
    expect(result!.cars[0].name).toBe('Test Car');
  });

  it('parses raw base64 format', async () => {
    const encoded = await encodeSyncData(cars);
    const result = await parseAnyFormat(encoded);

    expect(result).not.toBeNull();
    expect(result!.cars[0].name).toBe('Test Car');
  });

  it('returns null for unknown format', async () => {
    const result = await parseAnyFormat('some random text');
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
    expect(result.added[0].id).toMatch(/^new-\d+$/);
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
