import { create } from 'zustand';

import { type DailyDraw, getJournalRepo } from '@/db';
import { type DrawnCard, dailyCard } from '@/engine';
import { localDateKey } from '@/utils/dates';

import { useJournal } from './journal';
import { useSettings } from './settings';

type DailyState = {
  dateKey: string | null;
  /** Today's draw once revealed (stored, so it stays the same all day). */
  draw: DailyDraw | null;
  loading: boolean;
  /** Rewards for today (memory only, cleared on a new day): a second card and the deeper reading. */
  bonus: { dateKey: string; extra: DrawnCard | null; deeper: boolean } | null;
  load: (now?: Date) => Promise<void>;
  reveal: (now?: Date) => Promise<DailyDraw>;
  saveToJournal: () => Promise<string>;
  /** Draws today's second card (the same one all day, never the first card). */
  unlockExtra: () => void;
  unlockDeeper: () => void;
};

/** Card of the Day: computed from the private device seed + date, drawn (revealed) once per day. */
export const useDaily = create<DailyState>()((set, get) => ({
  dateKey: null,
  draw: null,
  loading: false,
  bonus: null,
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
  unlockExtra: () => {
    const { draw, dateKey } = get();
    if (!draw || !dateKey) return;
    const settings = useSettings.getState();
    const seed = settings.ensureDeviceSeed();
    let extra = dailyCard(seed, `${dateKey}|extra`, { reversals: settings.reversedCards });
    for (let n = 2; extra.cardId === draw.cardId && n < 10; n++) {
      extra = dailyCard(seed, `${dateKey}|extra${n}`, { reversals: settings.reversedCards });
    }
    set({ bonus: { dateKey, deeper: currentBonus(get(), dateKey)?.deeper ?? false, extra } });
  },
  unlockDeeper: () => {
    const { dateKey } = get();
    if (!dateKey) return;
    set({ bonus: { dateKey, extra: currentBonus(get(), dateKey)?.extra ?? null, deeper: true } });
  },
}));

const currentBonus = (state: { bonus: DailyState['bonus'] }, dateKey: string) =>
  state.bonus?.dateKey === dateKey ? state.bonus : null;
