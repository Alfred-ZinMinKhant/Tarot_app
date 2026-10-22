import { getCard } from '@/data/cards';
import type { ReadingArea, Suit, TarotCard } from '@/data/types';
import type { Language } from '@/i18n/languages';

import type { DrawnCard } from './draw';

export const TOPICS = ['general', 'love', 'career', 'money', 'health', 'question'] as const;
export type Topic = (typeof TOPICS)[number];

/** The reading text for one card in one position: the topic-specific reading when there is one. */
export function readingText(card: TarotCard, reversed: boolean, topic: Topic, lang: Language): string {
  const text = card[lang];
  const o = reversed ? 'reversed' : 'upright';
  if (topic === 'love' || topic === 'career' || topic === 'money' || topic === 'health') return text[topic][o];
  return text[o];
}

export type SummaryKey =
  | 'majorsMany'
  | 'majorsNone'
  | 'suitWands'
  | 'suitCups'
  | 'suitSwords'
  | 'suitPentacles'
  | 'reversedMany'
  | 'allUpright'
  | 'keywords'
  | 'advice'
  | `intro.${ReadingArea}`
  | `adviceTopic.${ReadingArea}`
  | `suit.${ReadingArea}.${Exclude<Suit, 'major'>}`;

export type SummaryLine = { key: SummaryKey; params?: Record<string, string> };

const SUIT_KEY: Record<Exclude<Suit, 'major'>, SummaryKey> = {
  wands: 'suitWands',
  cups: 'suitCups',
  swords: 'suitSwords',
  pentacles: 'suitPentacles',
};

const isArea = (topic: Topic): topic is ReadingArea =>
  topic === 'love' || topic === 'career' || topic === 'money' || topic === 'health';

const LIST_SEPARATOR: Record<Language, string> = { en: ', ', my: '၊ ' };

/**
 * A short, gentle overview of the whole spread built from simple patterns (how many Major Arcana,
 * a dominant suit, how many reversals), followed by the key themes and one piece of advice.
 * Returns i18n keys + params so the screen can render it in either language.
 */
export function summarize(
  drawn: readonly DrawnCard[],
  lang: Language,
  { reversals = true, topic = 'general' }: { reversals?: boolean; topic?: Topic } = {},
): SummaryLine[] {
  const cards = drawn.map((d) => ({ ...d, card: getCard(d.cardId)! })).filter((d) => d.card);
  const lines: SummaryLine[] = [];
  const n = cards.length;
  if (!n) return lines;
  const area = isArea(topic) ? topic : undefined;
  if (area) lines.push({ key: `intro.${area}` });

  if (n >= 3) {
    const majors = cards.filter((c) => c.card.arcana === 'major').length;
    if (majors >= Math.ceil(n / 2)) lines.push({ key: 'majorsMany' });
    else if (majors === 0) lines.push({ key: 'majorsNone' });

    const counts = new Map<Exclude<Suit, 'major'>, number>();
    for (const c of cards) if (c.card.suit !== 'major') counts.set(c.card.suit, (counts.get(c.card.suit) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [top, second] = ranked;
    if (top && top[1] >= 2 && (!second || top[1] > second[1])) lines.push({ key: area ? `suit.${area}.${top[0]}` : SUIT_KEY[top[0]] });

    if (reversals) {
      const reversed = cards.filter((c) => c.reversed).length;
      if (reversed >= Math.ceil(n / 2)) lines.push({ key: 'reversedMany' });
      else if (reversed === 0) lines.push({ key: 'allUpright' });
    }
  }

  const keywords = cards.map((c) => c.card[lang].keywords[0]!).filter((k, i, all) => all.indexOf(k) === i);
  lines.push({ key: 'keywords', params: { keywords: keywords.join(LIST_SEPARATOR[lang]) } });
  lines.push({ key: area ? `adviceTopic.${area}` : 'advice', params: { advice: cards[n - 1]!.card[lang].advice } });
  return lines;
}
