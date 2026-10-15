import { create } from 'zustand';

import { getJournalRepo, type NewReading, type ReadingRecord } from '@/db';

type JournalState = {
  readings: ReadingRecord[];
  loaded: boolean;
  refresh: () => Promise<void>;
  save: (input: NewReading) => Promise<ReadingRecord>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeAll: () => Promise<void>;
};

/** In-memory view of the journal; SQLite (src/db) is the source of truth. */
export const useJournal = create<JournalState>()((set, get) => ({
  readings: [],
  loaded: false,
  refresh: async () => {
    const repo = await getJournalRepo();
    set({ readings: await repo.listReadings(), loaded: true });
  },
  save: async (input) => {
    const repo = await getJournalRepo();
    const record = await repo.saveReading(input);
    set({ readings: [record, ...get().readings.filter((r) => r.id !== record.id)], loaded: true });
    return record;
  },
  updateNotes: async (id, notes) => {
    const repo = await getJournalRepo();
    await repo.updateNotes(id, notes);
    set({ readings: get().readings.map((r) => (r.id === id ? { ...r, notes, updatedAt: Date.now() } : r)) });
  },
  remove: async (id) => {
    const repo = await getJournalRepo();
    await repo.deleteReading(id);
    set({ readings: get().readings.filter((r) => r.id !== id) });
  },
  removeAll: async () => {
    const repo = await getJournalRepo();
    await repo.deleteAll();
    set({ readings: [] });
  },
}));
