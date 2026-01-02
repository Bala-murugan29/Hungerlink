import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Static resources bundled for production
import en from './locales/en/common.json';
import ta from './locales/ta/common.json';
import hi from './locales/hi/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
      hi: { translation: hi },
    },
    supportedLngs: ['en', 'ta', 'hi'],
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    saveMissing: process.env.NODE_ENV !== 'production',
  });

export default i18n;
