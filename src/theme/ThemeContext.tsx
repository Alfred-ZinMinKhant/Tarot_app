import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import type { Language } from '@/i18n/languages';
import { useFontStatus } from '@/store/fonts';
import { useSettings } from '@/store/settings';

import { type ColorTokens, darkColors } from './colors';
import { BASE_SIZES, type FontSizeSetting, type MyanmarFont, SIZE_MULTIPLIER, type TextVariant } from './typography';

export type AppTheme = {
  colors: ColorTokens;
  language: Language;
  fontSize: FontSizeSetting;
  /** Myanmar font actually in use (falls back to Padauk if Noto failed to load). */
  myanmarFont: MyanmarFont;
  /** Font size in dp for a variant, after the user's S/M/L setting. */
  size: (variant: TextVariant) => number;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function resolveMyanmarFont(preferred: MyanmarFont, available: MyanmarFont[]): MyanmarFont {
  if (available.includes(preferred)) return preferred;
  return available[0] ?? preferred;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const fontSize = useSettings((s) => s.fontSize);
  const preferredFont = useSettings((s) => s.myanmarFont);
  const available = useFontStatus((s) => s.available);
  const language = useLanguage();

  const value = useMemo<AppTheme>(() => {
    return {
      colors: darkColors,
      language,
      fontSize,
      myanmarFont: resolveMyanmarFont(preferredFont, available),
      size: (variant) => Math.round(BASE_SIZES[variant] * SIZE_MULTIPLIER[fontSize]),
    };
  }, [fontSize, preferredFont, available, language]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return theme;
}
