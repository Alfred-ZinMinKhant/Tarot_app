import type { OAuthProvider, SyncMethods } from '@/config/sync';
import type { DailyDraw, JournalRepo, SyncRecord } from '@/db/types';

/** Position in the server's change feed: rows are ordered by (server time, id). */
export type SyncCursor = { at: string; id: string } | null;

export interface SyncBackend {
  /** Rows changed on the server after `cursor`, oldest first, at most `limit`. */
  pull(cursor: SyncCursor, limit: number): Promise<{ rows: SyncRecord[]; cursor: SyncCursor }>;
  /** Upserts rows; the server keeps whichever version has the later `updatedAt`. */
  push(rows: SyncRecord[]): Promise<void>;
  /** Every Card of the Day draw stored for this account (about one small row per day). */
  pullDraws(): Promise<DailyDraw[]>;
  /** Upserts draws; the server keeps the first reveal of a day and only adds a missing journal link. */
  pushDraws(draws: DailyDraw[]): Promise<void>;
  /** The account's portable settings, or null if none were uploaded yet. */
  pullSettings(): Promise<RemoteSettings | null>;
  pushSettings(settings: RemoteSettings): Promise<void>;
}

export type RemoteSettings = { data: Record<string, unknown>; updatedAt: number };

/** Email one-time-code sign-in (no passwords, no deep links). */
export interface SyncAuth {
  /** Label of the signed-in account (its email, or the provider name if the email is hidden). */
  currentEmail(): Promise<string | null>;
  sendCode(email: string): Promise<void>;
  /** Returns the signed-in email. */
  verifyCode(email: string, code: string): Promise<string>;
  /** Opens the provider's sign-in page; returns the account label, or null if the person backed out. */
  signInWithProvider(provider: OAuthProvider): Promise<string | null>;
  signOut(): Promise<void>;
  /** Deletes the account and everything stored with it on the server, then signs out. */
  deleteAccount(): Promise<void>;
}

export type SyncServices = { auth: SyncAuth; backend: SyncBackend; methods: SyncMethods };

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
export async function syncJournal(
  repo: JournalRepo,
  backend: SyncBackend,
  cursor: SyncCursor,
): Promise<SyncResult> {
  let pulled = 0;
  let from = rewind(cursor);
  for (;;) {
    const page = await backend.pull(from, PAGE_SIZE);
    pulled += await repo.applyRemote(page.rows);
    if (
      page.cursor &&
      (!cursor ||
        page.cursor.at > cursor.at ||
        (page.cursor.at === cursor.at && page.cursor.id > cursor.id))
    ) {
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

/**
 * Syncs the Card of the Day history. A draw never changes once revealed, so there's no change
 * feed: compare against the (small) remote list, merge what's missing here, upload what's missing
 * there, and upload the journal link when only this device has it.
 */
export async function syncDraws(
  repo: JournalRepo,
  backend: SyncBackend,
): Promise<{ pulled: number; pushed: number }> {
  const remote = await backend.pullDraws();
  const pulled = await repo.applyRemoteDraws(remote);
  const remoteByDate = new Map(remote.map((d) => [d.dateKey, d]));
  const toPush = (await repo.listDailyDraws()).filter((d) => {
    const r = remoteByDate.get(d.dateKey);
    return !r || (d.readingId !== null && r.readingId === null);
  });
  if (toPush.length) await backend.pushDraws(toPush);
  return { pulled, pushed: toPush.length };
}

export type SettingsSyncResult = { pulled: boolean; pushed: boolean; updatedAt: number };

/**
 * Last write wins for the whole settings blob. `changedAt` is when this device last changed a
 * synced setting (0 = never since signing in). A server copy with nothing newer is replaced.
 */
export async function syncSettings(
  backend: SyncBackend,
  local: {
    changedAt: number;
    snapshot: () => Record<string, unknown>;
    apply: (data: Record<string, unknown>) => void;
  },
): Promise<SettingsSyncResult> {
  const remote = await backend.pullSettings();
  if (remote && remote.updatedAt > local.changedAt) {
    local.apply(remote.data);
    return { pulled: true, pushed: false, updatedAt: remote.updatedAt };
  }
  if (!remote || local.changedAt > remote.updatedAt) {
    const updatedAt = Math.max(local.changedAt, 1);
    await backend.pushSettings({ data: local.snapshot(), updatedAt });
    return { pulled: false, pushed: true, updatedAt };
  }
  return { pulled: false, pushed: false, updatedAt: remote.updatedAt };
}
