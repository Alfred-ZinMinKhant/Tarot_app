import type { JournalRepo, SyncRecord } from '@/db/types';

/** Position in the server's change feed: rows are ordered by (server time, id). */
export type SyncCursor = { at: string; id: string } | null;

export interface SyncBackend {
  /** Rows changed on the server after `cursor`, oldest first, at most `limit`. */
  pull(cursor: SyncCursor, limit: number): Promise<{ rows: SyncRecord[]; cursor: SyncCursor }>;
  /** Upserts rows; the server keeps whichever version has the later `updatedAt`. */
  push(rows: SyncRecord[]): Promise<void>;
}

/** Email one-time-code sign-in (no passwords, no deep links). */
export interface SyncAuth {
  currentEmail(): Promise<string | null>;
  sendCode(email: string): Promise<void>;
  /** Returns the signed-in email. */
  verifyCode(email: string, code: string): Promise<string>;
  signOut(): Promise<void>;
  /** Deletes the account and everything stored with it on the server, then signs out. */
  deleteAccount(): Promise<void>;
}

export type SyncServices = { auth: SyncAuth; backend: SyncBackend };

export type SyncResult = { cursor: SyncCursor; pulled: number; pushed: number };

export const PAGE_SIZE = 500;

/**
 * Server timestamps are taken when a transaction writes, but rows only become visible when it
 * commits, so a slow upload can appear "in the past". Each sync re-reads a short window before the
 * cursor; applying a row twice is harmless because older-or-equal versions are skipped.
 */
export const REWIND_MS = 2 * 60 * 1000;

export function rewind(cursor: SyncCursor, ms = REWIND_MS): SyncCursor {
  if (!cursor) return null;
  const t = Date.parse(cursor.at);
  return Number.isNaN(t) ? cursor : { at: new Date(t - ms).toISOString(), id: '' };
}

/**
 * One sync round, offline-first and last-write-wins by `updatedAt`:
 * 1. pull every server change since the cursor and merge it locally (newer wins);
 * 2. upload local changes; the server applies the same rule, so a stale upload is ignored there;
 * 3. clear the "changed" flag only for rows not edited again while uploading.
 */
export async function syncJournal(repo: JournalRepo, backend: SyncBackend, cursor: SyncCursor): Promise<SyncResult> {
  let pulled = 0;
  let from = rewind(cursor);
  for (;;) {
    const page = await backend.pull(from, PAGE_SIZE);
    pulled += await repo.applyRemote(page.rows);
    if (page.cursor && (!cursor || page.cursor.at > cursor.at || (page.cursor.at === cursor.at && page.cursor.id > cursor.id))) {
      cursor = page.cursor;
    }
    from = page.cursor ?? from;
    if (page.rows.length < PAGE_SIZE) break;
  }
  const pending = await repo.pendingChanges();
  for (let i = 0; i < pending.length; i += PAGE_SIZE) {
    const batch = pending.slice(i, i + PAGE_SIZE);
    await backend.push(batch);
    await repo.markSynced(batch);
  }
  return { cursor, pulled, pushed: pending.length };
}
