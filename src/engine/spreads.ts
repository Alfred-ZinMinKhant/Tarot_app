import raw from '@data/spreads.json';

import type { Language } from '@/i18n/languages';

export type SpreadPosition = {
  id: string;
  /** Layout in card units: x in card widths, y in card heights. */
  x: number;
  y: number;
  /** Degrees; 90 for the Celtic Cross "crossing" card. */
  rotate?: number;
} & Record<Language, { name: string; prompt: string }>;

export type Spread = {
  id: string;
  cardCount: number;
  positions: SpreadPosition[];
} & Record<Language, { name: string; description: string }>;

export const SPREADS: readonly Spread[] = raw as Spread[];

export type SpreadId = (typeof SPREADS)[number]['id'];

export function getSpread(id: string): Spread | undefined {
  return SPREADS.find((s) => s.id === id);
}

/** Bounding box of a spread layout in card units (width, height). */
export function layoutSize(spread: Spread): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const p of spread.positions) {
    width = Math.max(width, p.x + 1);
    height = Math.max(height, p.y + 1);
  }
  return { width, height };
}
