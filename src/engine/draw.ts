import { CARDS } from '@/data/cards';

import { type RandomInt, secureRandom } from './random';

export type DrawnCard = { cardId: string; reversed: boolean };

export type DrawOptions = {
  /** Allow reversed cards (Settings → Reversed cards). */
  reversals?: boolean;
  rand?: RandomInt;
  deck?: readonly string[];
};

export const DECK_IDS: readonly string[] = CARDS.map((c) => c.id);

/** Unbiased Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rand: RandomInt = secureRandom): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A freshly shuffled deck with each card's orientation decided up front (50/50 when reversals are
 * on). The reading screen fans this deck out and the user picks from it, so a spread can never
 * contain the same card twice.
 */
export function prepareDeck({ reversals = true, rand = secureRandom, deck = DECK_IDS }: DrawOptions = {}): DrawnCard[] {
  return shuffle(deck, rand).map((cardId) => ({ cardId, reversed: reversals ? rand(2) === 1 : false }));
}

/** Draws `count` distinct cards from a newly shuffled deck. */
export function drawCards(count: number, options: DrawOptions = {}): DrawnCard[] {
  const deck = prepareDeck(options);
  if (!Number.isInteger(count) || count < 0 || count > deck.length) {
    throw new RangeError(`Cannot draw ${count} cards from a deck of ${deck.length}`);
  }
  return deck.slice(0, count);
}
