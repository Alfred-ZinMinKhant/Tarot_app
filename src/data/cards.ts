/**
 * Read-only access to the bundled deck (`data/cards.json`), plus filtering and bilingual search.
 */
import raw from '@data/cards.json';

import type { Language } from '../i18n/languages';
import { stripZwsp } from '../utils/myanmar';
import { SUIT_LABELS } from './deck';
import type { CardText, LocalizedCard, Suit, TarotCard } from './types';

export const CARDS: readonly TarotCard[] = raw as TarotCard[];

const BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): TarotCard | undefined {
  return BY_ID.get(id);
}

export function cardText(card: TarotCard, lang: Language): CardText {
  return card[lang];
}

export function localize(card: TarotCard, lang: Language): LocalizedCard {
  const { en: _en, my: _my, ...rest } = card;
  return { ...rest, text: card[lang] };
}

export type SuitFilter = 'all' | Suit;

export const SUIT_FILTERS: readonly SuitFilter[] = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];

/** Lower-cases, removes zero-width spaces and collapses whitespace so both scripts compare cleanly. */
export function normaliseSearch(text: string): string {
  return stripZwsp(text).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Precomputed search haystack per card: names, keywords and suit in both languages. */
const HAYSTACK = new Map(
  CARDS.map((c) => [
    c.id,
    normaliseSearch(
      [
        c.en.name,
        c.my.name,
        ...c.en.keywords,
        ...c.my.keywords,
        SUIT_LABELS[c.suit].en,
        SUIT_LABELS[c.suit].my,
      ].join(' | '),
    ),
  ]),
);

/**
 * Filters by suit and matches every search term against names, keywords and suit labels in both
 * English and Burmese, so a Burmese user can type "ခွက်" or "cups" and get the same result.
 */
export function searchCards(query: string, suit: SuitFilter = 'all'): TarotCard[] {
  const terms = normaliseSearch(query).split(' ').filter(Boolean);
  return CARDS.filter((card) => {
    if (suit !== 'all' && card.suit !== suit) return false;
    if (!terms.length) return true;
    const hay = HAYSTACK.get(card.id) ?? '';
    return terms.every((t) => hay.includes(t));
  });
}

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Major Arcana numbering as printed on the cards (0 for The Fool). */
export function toRoman(n: number): string {
  if (n === 0) return '0';
  let out = '';
  let rest = n;
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}
