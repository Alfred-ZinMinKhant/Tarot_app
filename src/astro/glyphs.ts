import { SIGNS, type ZodiacId } from './chart';
import type { PlanetId } from './ephemeris';

export const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
export const PLANET_GLYPHS: Record<PlanetId, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  node: '☊',
};
export const RISING_GLYPH = '↑';

/** The text variation selector keeps the glyphs monochrome instead of emoji-styled. */
export const glyphText = (g: string) => `${g}︎`;

/** Zodiac sign glyph (♈…♓). */
export const signGlyph = (sign: ZodiacId): string => glyphText(SIGN_GLYPHS[SIGNS.indexOf(sign)] ?? '');
