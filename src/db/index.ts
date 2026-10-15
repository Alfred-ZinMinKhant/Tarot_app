import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { createJournalRepo } from './journalRepo';
import { migrate } from './schema';
import type { Db, JournalRepo } from './types';

export const DB_NAME = 'nattarot.db';

/** Adapts expo-sqlite's database object to the app's `Db` interface. */
export function fromExpoSqlite(db: SQLiteDatabase): Db {
  return {
    execAsync: (source) => db.execAsync(source),
    runAsync: (source, params = []) => db.runAsync(source, params),
    getAllAsync: (source, params = []) => db.getAllAsync(source, params),
    getFirstAsync: (source, params = []) => db.getFirstAsync(source, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let repo: Promise<JournalRepo> | null = null;

/** Opens (once) the on-device SQLite database, applies migrations and returns the journal repo. */
export function getJournalRepo(): Promise<JournalRepo> {
  repo ??= (async () => {
    const raw = await openDatabaseAsync(DB_NAME);
    const db = 'execAsync' in raw && 'prepareAsync' in raw ? fromExpoSqlite(raw) : (raw as unknown as Db);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await migrate(db);
    return createJournalRepo(db);
  })();
  return repo;
}

/** Test helper: forget the open database so the next call starts from an empty one. */
export function resetJournalRepo(): void {
  repo = null;
}

export * from './types';
