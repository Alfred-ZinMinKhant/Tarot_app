import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import brand from '@/config/brand.json';
import en from '../../locales/en.json';
import my from '../../locales/my.json';

import { type Language, languageFromLocaleTag } from './languages';

/**
 * The app name is injected from src/config/brand.json (the single source of
 * truth). Locale strings reference it with i18next nesting: `$t(appName)`.
 */
export const resources = {
  en: { translation: { ...en, appName: brand.appName.en } },
  my: { translation: { ...my, appName: brand.appName.my } },
} as const;

export function deviceLanguage(): Language {
  try {
    return languageFromLocaleTag(getLocales()[0]?.languageTag);
  } catch {
    return 'en';
  }
}

/** The app's single i18next instance. */
const i18n = createInstance();
let initialized = false;

export function initI18n(language: Language = deviceLanguage()) {
  if (initialized) return i18n;
  initialized = true;
  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'my'],
    returnNull: false,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export { i18n };
