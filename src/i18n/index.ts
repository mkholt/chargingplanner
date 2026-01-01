import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { resources } from '@/locales';
import { LS_KEYS } from '@/utils';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'da'],

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LS_KEYS.LANGUAGE,
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
