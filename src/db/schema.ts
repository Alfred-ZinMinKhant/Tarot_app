import type { Db } from './types';

/**
 * Ordered migrations; `PRAGMA user_version` records how many have been applied. Never edit a
 * migration that has shipped; append a new one instead.
 */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS readings (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('spread', 'daily')),
     spread_id TEXT NOT NULL,
     topic TEXT NOT NULL,
     question TEXT NOT NULL DEFAULT '',
     notes TEXT NOT NULL DEFAULT '',
     cards TEXT NOT NULL,
     date_key TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted_at INTEGER
   );
   CREATE INDEX IF NOT EXISTS readings_created_at ON readings (created_at DESC);
   CREATE INDEX IF NOT EXISTS readings_topic ON readings (topic);
   CREATE TABLE IF NOT EXISTS daily_draws (
     date_key TEXT PRIMARY KEY NOT NULL,
     card_id TEXT NOT NULL,
     reversed INTEGER NOT NULL,
     revealed_at INTEGER NOT NULL,
     reading_id TEXT
   );`,
];

export async function migrate(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version]!;
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
