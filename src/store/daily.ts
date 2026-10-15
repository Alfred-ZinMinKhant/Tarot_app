import { create } from 'zustand';

import { type DailyDraw, getJournalRepo } from '@/db';
import { dailyCard } from '@/engine';
import { localDateKey } from '@/utils/dates';

import { useJournal } from './journal';
import { useSettings } from './settings';

type DailyState = {
  dateKey: string | null;
  /** Today's draw once revealed (stored, so it stays the same all day). */
  draw: DailyDraw | null;
  loading: boolean;
  load: (now?: Date) => Promise<void>;
  reveal: (now?: Date) => Promise<DailyDraw>;
  saveToJournal: () => Promise<string>;
};

/** Card of the Day: computed from the private device seed + date, drawn (revealed) once per day. */
export const useDaily = create<DailyState>()((set, get) => ({
  dateKey: null,
  draw: null,
  loading: false,
  load: async (now = new Date()) => {
    const dateKey = localDateKey(now);
    set({ loading: true, dateKey });
    const repo = await getJournalRepo();
    const draw = await repo.getDailyDraw(dateKey);
    set({ draw, loading: false });
  },
  reveal: async (now = new Date()) => {
    const dateKey = localDateKey(now);
    const existing = get().dateKey === dateKey ? get().draw : null;
    if (existing) return existing;
    const settings = useSettings.getState();
    const seed = settings.ensureDeviceSeed();
    const card = dailyCard(seed, dateKey, { reversals: settings.reversedCards });
    const repo = await getJournalRepo();
    await repo.saveDailyDraw({ dateKey, cardId: card.cardId, reversed: card.reversed, revealedAt: now.getTime() });
    const draw = (await repo.getDailyDraw(dateKey))!;
    set({ dateKey, draw });
    return draw;
  },
  saveToJournal: async () => {
    const { draw } = get();
    if (!draw) throw new Error('Reveal the daily card first');
    if (draw.readingId) return draw.readingId;
    const record = await useJournal.getState().save({
      kind: 'daily',
      spreadId: 'daily',
      topic: 'general',
      question: '',
      cards: [{ positionId: 'daily', cardId: draw.cardId, reversed: draw.reversed }],
      dateKey: draw.dateKey,
    });
    const repo = await getJournalRepo();
    await repo.linkDailyReading(draw.dateKey, record.id);
    set({ draw: { ...draw, readingId: record.id } });
    return record.id;
  },
}));
