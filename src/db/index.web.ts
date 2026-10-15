/**
 * Web preview only (web is not a shipping target): keeps the journal in memory so the screens can
 * be exercised in a browser without SQLite's WebAssembly worker setup.
 */
import { uuidV4 } from '@/utils/id';

import { localDateKey } from '@/utils/dates';

import type { DailyDraw, JournalRepo, ReadingRecord } from './types';

export const DB_NAME = 'nattarot.db';

function createMemoryRepo(): JournalRepo {
  const readings = new Map<string, ReadingRecord>();
  const draws = new Map<string, DailyDraw>();
  return {
    async saveReading(input) {
      const createdAt = input.createdAt ?? Date.now();
      const record: ReadingRecord = {
        id: uuidV4(),
        kind: input.kind,
        spreadId: input.spreadId,
        topic: input.topic,
        question: input.question.trim(),
        notes: input.notes ?? '',
        cards: input.cards,
        dateKey: input.dateKey ?? localDateKey(new Date(createdAt)),
        createdAt,
        updatedAt: createdAt,
      };
      readings.set(record.id, record);
      return record;
    },
    async listReadings(filter = {}) {
      return [...readings.values()]
        .filter((r) => !filter.topic || filter.topic === 'all' || r.topic === filter.topic)
        .filter((r) => !filter.kind || filter.kind === 'all' || r.kind === filter.kind)
        .filter((r) => filter.since === undefined || r.createdAt >= filter.since)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async getReading(id) {
      return readings.get(id) ?? null;
    },
    async updateNotes(id, notes) {
      const r = readings.get(id);
      if (r) readings.set(id, { ...r, notes, updatedAt: Date.now() });
    },
    async deleteReading(id) {
      readings.delete(id);
    },
    async deleteAll() {
      readings.clear();
      draws.clear();
    },
    // The web preview has no cloud backup; these keep the interface complete.
    async pendingChanges() {
      return [];
    },
    async markSynced() {},
    async markAllDirty() {},
    async applyRemote() {
      return 0;
    },
    async getDailyDraw(dateKey) {
      return draws.get(dateKey) ?? null;
    },
    async saveDailyDraw(draw) {
      if (!draws.has(draw.dateKey)) draws.set(draw.dateKey, { ...draw, readingId: null });
    },
    async linkDailyReading(dateKey, readingId) {
      const d = draws.get(dateKey);
      if (d) draws.set(dateKey, { ...d, readingId });
    },
  };
}

let repo: Promise<JournalRepo> | null = null;

export function getJournalRepo(): Promise<JournalRepo> {
  repo ??= Promise.resolve(createMemoryRepo());
  return repo;
}

export function resetJournalRepo(): void {
  repo = null;
}

export * from './types';
