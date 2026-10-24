import { VIN_PATTERN } from '@/utils';

export type SkodaKeyValues = {
  vin: string;
  apiKey: string;
  /** This device's vault password; only asked for when protection is on */
  password: string;
};

/** True when the fields are filled in well enough to submit */
export function isSkodaKeyComplete({ vin, apiKey, password }: SkodaKeyValues, requiresPassword: boolean): boolean {
  return VIN_PATTERN.test(vin) && apiKey.trim() !== '' && (!requiresPassword || password !== '');
}
