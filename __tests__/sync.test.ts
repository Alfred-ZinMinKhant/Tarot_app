import { FakeCloud } from '../test/mocks/fakeCloud';

import { createJournalRepo } from '@/db/journalRepo';
import { migrate } from '@/db/schema';
import { openSqlJsDatabase } from '@/db/sqljsAdapter';
import type { JournalRepo } from '@/db/types';
import { PAGE_SIZE, rewind, type SyncCursor, syncJournal } from '@/sync/engine';

/** A simulated phone: its own SQLite database, clock and sync cursor. */
async function device(start: number) {
  const db = await openSqlJsDatabase();
  await migrate(db);
  let t = start;
  const clock = { now: () => t, set: (v: number) => (t = v) };
  const repo = createJournalRepo(db, clock.now);
  let cursor: SyncCursor = null;
  return {
    repo,
    clock,
    sync: async (cloud: FakeCloud) => {
      const r = await syncJournal(repo, cloud.backend(), cursor);
      cursor = r.cursor;
      return r;
    },
  };
}

const reading = (repo: JournalRepo, question: string, createdAt: number) =>
  repo.saveReading({
    kind: 'spread',
    spreadId: 'one-card',
    topic: 'general',
    question,
    cards: [{ positionId: 'focus', cardId: 'major-00-fool', reversed: false }],
    createdAt,
  });

describe('journal sync (last write wins)', () => {
  it('copies readings between two devices, including Burmese text', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    const saved = await reading(a.repo, 'ဒီအပတ် ဘာကို အာရုံစိုက်ရမလဲ', 1000);

    expect(await a.sync(cloud)).toMatchObject({ pulled: 0, pushed: 1 });
    expect(await a.repo.pendingChanges()).toEqual([]);
    expect(await b.sync(cloud)).toMatchObject({ pulled: 1, pushed: 0 });
    expect(await b.repo.getReading(saved.id)).toEqual(saved);
    // Nothing new: a second round moves nothing.
    expect(await b.sync(cloud)).toMatchObject({ pulled: 0, pushed: 0 });
  });

  it('keeps the later edit when two devices change the same reading', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    const r = await reading(a.repo, 'Q', 1000);
    await a.sync(cloud);
    await b.sync(cloud);

    // Offline edits: A at t=5000, B later at t=9000.
    a.clock.set(5000);
    await a.repo.updateNotes(r.id, 'from A');
    b.clock.set(9000);
    await b.repo.updateNotes(r.id, 'from B');

    await b.sync(cloud); // B uploads first
    await a.sync(cloud); // A pulls B's newer note; its own older upload is rejected by the server
    await b.sync(cloud);
    expect((await a.repo.getReading(r.id))!.notes).toBe('from B');
    expect((await b.repo.getReading(r.id))!.notes).toBe('from B');
    expect(cloud.rows.get(r.id)!.notes).toBe('from B');
  });

  it('an older offline edit never overwrites a newer one, whatever the order', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    const r = await reading(a.repo, 'Q', 1000);
    await a.sync(cloud);
    await b.sync(cloud);
    b.clock.set(9000);
    await b.repo.updateNotes(r.id, 'newer');
    await b.sync(cloud);
    a.clock.set(5000);
    await a.repo.updateNotes(r.id, 'older');
    await a.sync(cloud);
    expect((await a.repo.getReading(r.id))!.notes).toBe('newer');
    expect(cloud.rows.get(r.id)!.notes).toBe('newer');
  });

  it('propagates deletes as tombstones, unless the other device edited later', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    const gone = await reading(a.repo, 'delete me', 1000);
    const kept = await reading(a.repo, 'keep me', 1000);
    await a.sync(cloud);
    await b.sync(cloud);

    a.clock.set(3000);
    await a.repo.deleteReading(gone.id);
    await a.repo.deleteReading(kept.id);
    b.clock.set(4000);
    await b.repo.updateNotes(kept.id, 'still useful'); // later than A's delete

    await a.sync(cloud);
    await b.sync(cloud);
    await a.sync(cloud);
    expect(await b.repo.getReading(gone.id)).toBeNull();
    expect(cloud.rows.get(gone.id)).toMatchObject({ deletedAt: 3000, question: '', notes: '' });
    expect((await a.repo.getReading(kept.id))!.notes).toBe('still useful');
  });

  it('keeps local changes when offline and uploads them later', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    await reading(a.repo, 'Q', 1000);
    cloud.offline = true;
    await expect(a.sync(cloud)).rejects.toThrow('offline');
    expect(await a.repo.pendingChanges()).toHaveLength(1);
    cloud.offline = false;
    expect(await a.sync(cloud)).toMatchObject({ pushed: 1 });
  });

  it('does not lose an edit made while an upload is in flight', async () => {
    const a = await device(1000);
    const r = await reading(a.repo, 'Q', 1000);
    const pending = await a.repo.pendingChanges();
    a.clock.set(2000);
    await a.repo.updateNotes(r.id, 'edited during upload');
    await a.repo.markSynced(pending); // the upload of the old version finishes
    expect(await a.repo.pendingChanges()).toHaveLength(1);
  });

  it('pages through large change feeds', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    for (let i = 0; i < PAGE_SIZE + 3; i++) await reading(a.repo, `Q${i}`, 1000 + i);
    await a.sync(cloud);
    expect(cloud.pushes).toBe(2);
    expect(await b.sync(cloud)).toMatchObject({ pulled: PAGE_SIZE + 3 });
    expect(await b.repo.listReadings()).toHaveLength(PAGE_SIZE + 3);
  });

  it('re-reads a short window before the cursor', () => {
    expect(rewind(null)).toBeNull();
    expect(rewind({ at: '2026-10-15T10:00:00.000Z', id: 'x' })).toEqual({ at: '2026-10-15T09:58:00.000Z', id: '' });
    expect(rewind({ at: 'not a date', id: 'x' })).toEqual({ at: 'not a date', id: 'x' });
  });
});
