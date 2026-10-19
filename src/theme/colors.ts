/**
 * Brand palette. Contrast pairs used for text were checked against WCAG AA
 * (4.5:1 for body text, 3:1 for large text / UI chrome). See docs/DECISIONS.md.
 */
export const palette = {
  indigo: '#14102B',
  midnight: '#2A1B54',
  midnightSoft: '#3A2A6B',
  gold: '#D4AF37',
  goldDeep: '#8A6D12',
  ivory: '#F8F1E4',
  ivoryDeep: '#EDE2CC',
  teal: '#4FB6A8',
  tealDeep: '#1F6F66',
  rose: '#E57A8A',
  roseDeep: '#A23A4C',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  danger: string;
  tabBar: string;
  overlay: string;
};

export const darkColors: ColorTokens = {
  background: palette.indigo,
  surface: palette.midnight,
  surfaceAlt: palette.midnightSoft,
  border: '#4A3A80',
  text: palette.ivory,
  textMuted: '#C9BFD9',
  primary: palette.gold,
  onPrimary: palette.indigo,
  accent: palette.teal,
  onAccent: palette.indigo,
  danger: palette.rose,
  tabBar: '#100C24',
  overlay: 'rgba(0,0,0,0.6)',
};
