import { da } from './da';
import { en } from './en';

// Compile-time assertion: da.translation must match en.translation structure
// If this errors, add missing keys to da.ts
type AssertTranslationParity<T extends typeof en> = T;
export type DaParityCheck = AssertTranslationParity<typeof da>;

export const resources = {
  en,
  da,
};
