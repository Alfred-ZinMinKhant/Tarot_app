import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n/languages';
import type { FontSizeSetting, MyanmarFont } from '@/theme/typography';

export type ThemeMode = 'system' | 'light' | 'dark';

export type SettingsState = {
  /** null = follow the device locale. */
  language: Language | null;
  themeMode: ThemeMode;
  fontSize: FontSizeSetting;
  myanmarFont: MyanmarFont;
  burmeseNumerals: boolean;
  hasOnboarded: boolean;
  setLanguage: (language: Language | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSizeSetting) => void;
  setMyanmarFont: (font: MyanmarFont) => void;
  setBurmeseNumerals: (enabled: boolean) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS = {
  language: null,
  themeMode: 'system',
  fontSize: 'M',
  myanmarFont: 'noto',
  burmeseNumerals: false,
  hasOnboarded: false,
} satisfies Partial<SettingsState>;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setFontSize: (fontSize) => set({ fontSize }),
      setMyanmarFont: (myanmarFont) => set({ myanmarFont }),
      setBurmeseNumerals: (burmeseNumerals) => set({ burmeseNumerals }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'nat-tarot.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, themeMode, fontSize, myanmarFont, burmeseNumerals, hasOnboarded }) => ({
        language,
        themeMode,
        fontSize,
        myanmarFont,
        burmeseNumerals,
        hasOnboarded,
      }),
    },
  ),
);
