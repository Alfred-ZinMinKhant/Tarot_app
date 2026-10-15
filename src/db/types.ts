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

/** A reading as exchanged with the cloud: includes tombstones (`deletedAt` set). */
export type SyncRecord = ReadingRecord & { deletedAt: number | null };

export type NewReading = Pick<
  ReadingRecord,
  'kind' | 'spreadId' | 'topic' | 'question' | 'cards'
> & {
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
  /** Rows changed locally since their last upload, tombstones included. */
  pendingChanges(): Promise<SyncRecord[]>;
  /** Clears the "changed" flag for rows that haven't been edited again since they were read. */
  markSynced(rows: Pick<SyncRecord, 'id' | 'updatedAt'>[]): Promise<void>;
  /** Flags every row for upload (after signing in to another account or deleting the cloud copy). */
  markAllDirty(): Promise<void>;
  /** Merges rows from the cloud, last write (by `updatedAt`) wins. Returns how many changed locally. */
  applyRemote(rows: SyncRecord[]): Promise<number>;
  getDailyDraw(dateKey: string): Promise<DailyDraw | null>;
  listDailyDraws(): Promise<DailyDraw[]>;
  /**
   * Merges Card of the Day draws from the cloud: a day already drawn here keeps its card (first
   * reveal wins) and only gains a journal link it lacked. Returns how many rows changed locally.
   */
  applyRemoteDraws(draws: DailyDraw[]): Promise<number>;
  saveDailyDraw(draw: Omit<DailyDraw, 'readingId'>): Promise<void>;
  linkDailyReading(dateKey: string, readingId: string): Promise<void>;
}
