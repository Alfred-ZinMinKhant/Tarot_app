import { darkColors, lightColors } from '@/theme/colors';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ['dark', darkColors],
  ['light', lightColors],
])('%s theme meets WCAG AA', (_, c) => {
  it.each([
    ['text/background', c.text, c.background],
    ['text/surface', c.text, c.surface],
    ['text/surfaceAlt', c.text, c.surfaceAlt],
    ['textMuted/background', c.textMuted, c.background],
    ['textMuted/surface', c.textMuted, c.surface],
    ['onPrimary/primary', c.onPrimary, c.primary],
    ['onAccent/accent', c.onAccent, c.accent],
    ['primary/background', c.primary, c.background],
    ['primary/tabBar', c.primary, c.tabBar],
    ['textMuted/tabBar', c.textMuted, c.tabBar],
  ])('%s ≥ 4.5', (_pair, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
