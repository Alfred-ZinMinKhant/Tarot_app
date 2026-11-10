import { getCard } from '@/data/cards';
import type { ReadingArea, Suit, TarotCard } from '@/data/types';
import type { Language } from '@/i18n/languages';

import type { DrawnCard } from './draw';
import { pairNotes } from './pairs';

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
  | 'pair'
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

  for (const note of pairNotes(drawn, lang)) lines.push({ key: 'pair', params: { note } });

  const keywords = cards.map((c) => c.card[lang].keywords[0]!).filter((k, i, all) => all.indexOf(k) === i);
  lines.push({ key: 'keywords', params: { keywords: keywords.join(LIST_SEPARATOR[lang]) } });
  const last = cards[n - 1]!;
  lines.push({ key: area ? `adviceTopic.${area}` : 'advice', params: { advice: reversals && last.reversed ? last.card[lang].adviceReversed : last.card[lang].advice } });
  return lines;
}

const TOPIC_WORDS: Record<ReadingArea, RegExp> = {
  love: /\b(love|loves|loved|relationship|boyfriend|girlfriend|partner|crush|dating|date|marry|marriage|husband|wife|ex|heart|romance|romantic)\b|ချစ်|ရည်းစား|အိမ်ထောင်|ခင်ပွန်း|ဇနီး|အချစ်/i,
  career: /\b(job|jobs|career|work|boss|interview|promotion|business|resign|quit|hire|hired|colleague|office|exam|study|school)\b|အလုပ်|လုပ်ငန်း|ရာထူး|စာမေးပွဲ|ကျောင်း/i,
  money: /\b(money|salary|pay|debt|loan|invest|income|afford|rent|savings|cash|financial|finances|buy|sell)\b|ငွေ|လစာ|အကြွေး|ရင်းနှီး|ဝင်ငွေ/i,
  health: /\b(health|healthy|sick|ill|illness|doctor|anxiety|anxious|stress|stressed|sleep|tired|energy|healing|recover|recovery)\b|ကျန်းမာ|ရောဂါ|ဆရာဝန်|စိတ်ဖိစီး|အိပ်/i,
};

/** Guesses which topic a typed question is about, or null when none stands out. Used for a suggestion only. */
export function suggestTopic(question: string): ReadingArea | null {
  const q = question.trim();
  if (!q) return null;
  let best: ReadingArea | null = null;
  let bestCount = 0;
  for (const area of Object.keys(TOPIC_WORDS) as ReadingArea[]) {
    const global = new RegExp(TOPIC_WORDS[area].source, 'gi');
    const count = (q.match(global) ?? []).length;
    if (count > bestCount) {
      best = area;
      bestCount = count;
    }
  }
  return best;
}
