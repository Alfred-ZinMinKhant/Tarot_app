import { CARDS, getCard } from '@/data/cards';
import type { Suit } from '@/data/types';

import { type RandomInt, secureRandom } from './random';

export type DrawnCard = { cardId: string; reversed: boolean };

export type DrawOptions = {
  /** Allow reversed cards (Settings → Reversed cards). */
  reversals?: boolean;
  rand?: RandomInt;
  deck?: readonly string[];
  /** Gently favours the suits that suit the reading topic; general/question stay uniform. */
  topic?: string;
};

/** How much more likely a suit's cards are to land near the top of the deck for a topic. Major Arcana stay at 1. */
const TOPIC_SUIT_WEIGHT: Record<string, Partial<Record<Suit, number>>> = {
  love: { cups: 1.5 },
  career: { wands: 1.4, pentacles: 1.4 },
  money: { pentacles: 1.6 },
  health: { cups: 1.3, pentacles: 1.3 },
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
 * Weighted shuffle without replacement (Efraimidis–Spirakis): each item gets key u^(1/w) and the items
 * are sorted by key descending, so higher weights tend to come earlier but every order stays possible.
 */
export function weightedShuffle<T>(items: readonly T[], weight: (item: T) => number, rand: RandomInt = secureRandom): T[] {
  const RES = 2 ** 30;
  return items
    .map((item) => ({ item, key: Math.pow((rand(RES) + 0.5) / RES, 1 / weight(item)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

/**
 * A freshly shuffled deck with each card's orientation decided up front (50/50 when reversals are
 * on). The reading screen fans this deck out and the user picks from it, so a spread can never
 * contain the same card twice.
 */
export function prepareDeck({ reversals = true, rand = secureRandom, deck = DECK_IDS, topic }: DrawOptions = {}): DrawnCard[] {
  const weights = topic ? TOPIC_SUIT_WEIGHT[topic] : undefined;
  const ordered = weights
    ? weightedShuffle(deck, (id) => weights[getCard(id)?.suit as Suit] ?? 1, rand)
    : shuffle(deck, rand);
  return ordered.map((cardId) => ({ cardId, reversed: reversals ? rand(2) === 1 : false }));
}

/** Draws `count` distinct cards from a newly shuffled deck. */
export function drawCards(count: number, options: DrawOptions = {}): DrawnCard[] {
  const deck = prepareDeck(options);
  if (!Number.isInteger(count) || count < 0 || count > deck.length) {
    throw new RangeError(`Cannot draw ${count} cards from a deck of ${deck.length}`);
  }
  return deck.slice(0, count);
}
