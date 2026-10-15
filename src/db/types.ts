import type { Topic } from '@/engine';

/** The subset of expo-sqlite's async API the app uses (also implemented over sql.js for tests). */
export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export type SqlValue = string | number | null;

export type ReadingKind = 'spread' | 'daily';

export type SavedCard = { positionId: string; cardId: string; reversed: boolean };

export type ReadingRecord = {
  id: string;
  kind: ReadingKind;
  /** Spread id, or "daily" for a Card of the Day entry. */
  spreadId: string;
  topic: Topic;
  question: string;
  notes: string;
  cards: SavedCard[];
  /** Local calendar date of the reading (YYYY-MM-DD). */
  dateKey: string;
  createdAt: number;
  updatedAt: number;
};

export type NewReading = Pick<ReadingRecord, 'kind' | 'spreadId' | 'topic' | 'question' | 'cards'> & {
  notes?: string;
  createdAt?: number;
  dateKey?: string;
};

export type DailyDraw = {
  dateKey: string;
  cardId: string;
  reversed: boolean;
  revealedAt: number;
  readingId: string | null;
};

export type ReadingFilter = {
  topic?: Topic | 'all';
  kind?: ReadingKind | 'all';
  /** Inclusive lower bound on createdAt (ms). */
  since?: number;
};

export interface JournalRepo {
  saveReading(input: NewReading): Promise<ReadingRecord>;
  listReadings(filter?: ReadingFilter): Promise<ReadingRecord[]>;
  getReading(id: string): Promise<ReadingRecord | null>;
  updateNotes(id: string, notes: string): Promise<void>;
  /** Hides a reading (kept as a tombstone so a future sync can propagate the delete). */
  deleteReading(id: string): Promise<void>;
  /** Permanently removes every reading and daily draw (Settings → Delete my data). */
  deleteAll(): Promise<void>;
  getDailyDraw(dateKey: string): Promise<DailyDraw | null>;
  saveDailyDraw(draw: Omit<DailyDraw, 'readingId'>): Promise<void>;
  linkDailyReading(dateKey: string, readingId: string): Promise<void>;
}
