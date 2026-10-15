/** File-system helpers for the card build (kept apart from pure logic so tests can import it). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CardSource } from '../../src/data/types';

export const ROOT = join(__dirname, '..', '..');
export const SOURCES_DIR = join(ROOT, 'data', 'cards');
export const CARDS_JSON = join(ROOT, 'data', 'cards.json');
export const REVIEW_JSON = join(ROOT, 'data', 'cards.review.json');

export function readSources(): CardSource[] {
  return readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(join(SOURCES_DIR, f), 'utf8')) as CardSource[]);
}

export function serialise(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}
