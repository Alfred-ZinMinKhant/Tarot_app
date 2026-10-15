import type { Language } from '@/i18n/languages';

export const FONT_FAMILIES = {
  notoRegular: 'NotoSansMyanmar_400Regular',
  notoBold: 'NotoSansMyanmar_700Bold',
  padaukRegular: 'Padauk_400Regular',
  padaukBold: 'Padauk_700Bold',
} as const;

export type MyanmarFont = 'noto' | 'padauk';
export type FontSizeSetting = 'S' | 'M' | 'L';
export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

/** Base sizes in dp, before the user's S/M/L setting and system font scaling. */
export const BASE_SIZES: Record<TextVariant, number> = {
  display: 30,
  title: 24,
  heading: 19,
  body: 16,
  label: 15,
  caption: 13,
};

export const SIZE_MULTIPLIER: Record<FontSizeSetting, number> = {
  S: 0.9,
  M: 1,
  L: 1.15,
};

/**
 * Burmese glyphs stack diacritics above and below the base consonant, so the
 * line box must be much taller than for Latin text. Noto Sans Myanmar's
 * ascent+descent is ~2.18em; 1.8 keeps stacked syllables unclipped in
 * practice while still reading as one paragraph. Never go below 1.6.
 */
export const LINE_HEIGHT: Record<'latin' | 'myanmar', number> = {
  latin: 1.4,
  myanmar: 1.8,
};

export function fontFamilyFor(
  script: 'latin' | 'myanmar',
  bold: boolean,
  myanmarFont: MyanmarFont,
): string | undefined {
  if (script === 'latin') return undefined; // platform system font
  if (myanmarFont === 'padauk') return bold ? FONT_FAMILIES.padaukBold : FONT_FAMILIES.padaukRegular;
  return bold ? FONT_FAMILIES.notoBold : FONT_FAMILIES.notoRegular;
}

export function scriptForLanguage(language: Language): 'latin' | 'myanmar' {
  return language === 'my' ? 'myanmar' : 'latin';
}
