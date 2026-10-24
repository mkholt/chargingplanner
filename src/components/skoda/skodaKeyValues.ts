import { VIN_PATTERN } from '@/utils';

export type SkodaKeyValues = {
  vin: string;
  apiKey: string;
};

/** True when the fields are filled in well enough to submit */
export function isSkodaKeyComplete({ vin, apiKey }: SkodaKeyValues): boolean {
  return VIN_PATTERN.test(vin) && apiKey.trim() !== '';
}
