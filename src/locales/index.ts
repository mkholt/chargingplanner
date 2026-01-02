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

// Derive language code type from resources keys (compile-time safe)
export type LanguageCode = keyof typeof resources;

// Language metadata - Record ensures all language codes have entries
export const LANGUAGES: Record<LanguageCode, { nativeName: string; flag: string }> = {
  en: { nativeName: 'English', flag: '🇬🇧' },
  da: { nativeName: 'Dansk', flag: '🇩🇰' },
};

// For i18n config - derived from resources keys
export const SUPPORTED_LANGUAGES = Object.keys(resources) as LanguageCode[];

// All languages as array for UI iteration
export const ALL_LANGUAGES = SUPPORTED_LANGUAGES.map(code => ({
  code,
  ...LANGUAGES[code],
}));
