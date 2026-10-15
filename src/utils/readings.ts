import type { ShareEntry } from '@/components/ShareCard';
import { getCard } from '@/data/cards';
import type { ReadingRecord, SavedCard } from '@/db/types';
import { getSpread } from '@/engine';
import type { Language } from '@/i18n/languages';
import type { Topic } from '@/engine';

/** Spread name for a saved reading, or the given label for Card of the Day entries. */
export function readingTitle(r: Pick<ReadingRecord, 'kind' | 'spreadId'>, lang: Language, dailyLabel: string): string {
  if (r.kind === 'daily') return dailyLabel;
  return getSpread(r.spreadId)?.[lang].name ?? r.spreadId;
}

/** Position name for a saved card (null for the daily card, which has no spread position). */
export function positionName(spreadId: string, positionId: string, lang: Language): string | null {
  const pos = getSpread(spreadId)?.positions.find((p) => p.id === positionId);
  return pos ? pos[lang].name : null;
}

export function shareEntries(spreadId: string, cards: readonly SavedCard[], lang: Language): ShareEntry[] {
  return cards.flatMap((c) => {
    const card = getCard(c.cardId);
    return card ? [{ position: positionName(spreadId, c.positionId, lang), card, reversed: c.reversed }] : [];
  });
}

export type DateRange = 'all' | '7' | '30' | '365';
const DAY = 24 * 60 * 60 * 1000;

export function filterReadings(
  readings: readonly ReadingRecord[],
  topic: Topic | 'all',
  range: DateRange,
  now = Date.now(),
): ReadingRecord[] {
  const since = range === 'all' ? -Infinity : now - Number(range) * DAY;
  return readings.filter((r) => (topic === 'all' || r.topic === topic) && r.createdAt >= since);
}
