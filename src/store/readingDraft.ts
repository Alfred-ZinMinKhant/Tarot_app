import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DrawnCard, Spread, Topic } from '@/engine';

/** An unfinished reading is offered again for this long, then dropped. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** A reading that was started but not finished: enough to put the cards back as they were. */
export type ReadingDraft = {
  spreadId: string;
  topic: Topic;
  question: string;
  /** The face-down fan, in order. Picks are indexes into it. */
  deck: DrawnCard[];
  picks: number[];
  revealed: boolean[];
  savedAt: number;
};

type DraftState = {
  draft: ReadingDraft | null;
  save: (draft: ReadingDraft) => void;
  clear: () => void;
};

/** Stored on this device only; never exported or synced. Cleared with "Delete all data". */
export const useReadingDraft = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      save: (draft) => set({ draft }),
      clear: () => set({ draft: null }),
    }),
    {
      name: 'nat-tarot.reading-draft',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ draft: s.draft }),
    },
  ),
);

/** The draft if it belongs to this spread, is recent, and still matches the spread's shape. */
export function usableDraft(
  draft: ReadingDraft | null,
  spread: Spread | undefined,
  now = Date.now(),
): ReadingDraft | null {
  if (!draft || !spread || draft.spreadId !== spread.id) return null;
  if (now - draft.savedAt > DRAFT_TTL_MS) return null;
  const n = spread.cardCount;
  const validPicks =
    draft.picks.length > 0 &&
    draft.picks.length <= n &&
    draft.picks.every((i) => Number.isInteger(i) && i >= 0 && i < draft.deck.length);
  return validPicks && draft.revealed.length === n ? draft : null;
}
