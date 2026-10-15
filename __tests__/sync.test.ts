import { FakeCloud } from '../test/mocks/fakeCloud';

import { createJournalRepo } from '@/db/journalRepo';
import { migrate } from '@/db/schema';
import { openSqlJsDatabase } from '@/db/sqljsAdapter';
import type { JournalRepo } from '@/db/types';
import {
  PAGE_SIZE,
  rewind,
  type SyncCursor,
  syncDraws,
  syncJournal,
  syncSettings,
} from '@/sync/engine';
import { signInMethods } from '@/config/sync';
import { sanitizeSettings } from '@/sync/settingsData';

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
    expect(rewind({ at: '2026-10-15T10:00:00.000Z', id: 'x' })).toEqual({
      at: '2026-10-15T09:58:00.000Z',
      id: '',
    });
    expect(rewind({ at: 'not a date', id: 'x' })).toEqual({ at: 'not a date', id: 'x' });
  });
});

describe('Card of the Day history sync', () => {
  const draw = (dateKey: string, cardId: string) => ({
    dateKey,
    cardId,
    reversed: false,
    revealedAt: 5,
  });

  it('copies draws to another device and keeps the first reveal of a day', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    await a.repo.saveDailyDraw(draw('2026-10-14', 'major-00-fool'));
    await a.repo.saveDailyDraw(draw('2026-10-15', 'major-01-magician'));
    await b.repo.saveDailyDraw(draw('2026-10-15', 'major-02-high-priestess'));

    expect(await syncDraws(a.repo, cloud.backend())).toEqual({ pulled: 0, pushed: 2 });
    expect(await syncDraws(b.repo, cloud.backend())).toEqual({ pulled: 1, pushed: 0 });

    expect((await b.repo.getDailyDraw('2026-10-14'))?.cardId).toBe('major-00-fool');
    // b drew the 15th first on its own phone: that card stays.
    expect((await b.repo.getDailyDraw('2026-10-15'))?.cardId).toBe('major-02-high-priestess');
    // Nothing changed since: a second round moves nothing.
    expect(await syncDraws(b.repo, cloud.backend())).toEqual({ pulled: 0, pushed: 0 });
  });

  it('carries the journal link, but never to a reading that is missing or deleted', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const b = await device(1000);
    const saved = await reading(a.repo, 'Daily', 1000);
    await a.repo.saveDailyDraw(draw('2026-10-15', 'major-00-fool'));
    await a.repo.linkDailyReading('2026-10-15', saved.id);

    await syncJournal(a.repo, cloud.backend(), null);
    await syncDraws(a.repo, cloud.backend());
    await syncJournal(b.repo, cloud.backend(), null);
    await syncDraws(b.repo, cloud.backend());
    expect((await b.repo.getDailyDraw('2026-10-15'))?.readingId).toBe(saved.id);

    // A third phone that never received the reading doesn't get a dangling link.
    const c = await device(1000);
    await syncDraws(c.repo, cloud.backend());
    expect((await c.repo.getDailyDraw('2026-10-15'))?.readingId).toBeNull();
  });

  it('uploads a link made after the draw was already backed up', async () => {
    const cloud = new FakeCloud();
    const a = await device(1000);
    const saved = await reading(a.repo, 'Daily', 1000);
    await a.repo.saveDailyDraw(draw('2026-10-15', 'major-00-fool'));
    await syncDraws(a.repo, cloud.backend());
    await a.repo.linkDailyReading('2026-10-15', saved.id);
    expect(await syncDraws(a.repo, cloud.backend())).toEqual({ pulled: 0, pushed: 1 });
    expect(cloud.draws.get('2026-10-15')?.readingId).toBe(saved.id);
  });
});

describe('settings sync (last write wins)', () => {
  const local = (changedAt: number, data: Record<string, unknown> = { fontSize: 'L' }) => {
    const applied: Record<string, unknown>[] = [];
    return {
      applied,
      changedAt,
      snapshot: () => data,
      apply: (d: Record<string, unknown>) => applied.push(d),
    };
  };

  it('uploads when the cloud has nothing', async () => {
    const cloud = new FakeCloud();
    const l = local(0);
    expect(await syncSettings(cloud.backend(), l)).toMatchObject({
      pushed: true,
      pulled: false,
      updatedAt: 1,
    });
    expect(cloud.settings?.data).toEqual({ fontSize: 'L' });
  });

  it('takes the cloud copy when it is newer, and uploads when this phone is newer', async () => {
    const cloud = new FakeCloud();
    cloud.settings = { data: { fontSize: 'S' }, updatedAt: 500 };
    const older = local(100);
    expect(await syncSettings(cloud.backend(), older)).toMatchObject({
      pulled: true,
      updatedAt: 500,
    });
    expect(older.applied).toEqual([{ fontSize: 'S' }]);

    const newer = local(900);
    expect(await syncSettings(cloud.backend(), newer)).toMatchObject({
      pushed: true,
      updatedAt: 900,
    });
    expect(cloud.settings).toEqual({ data: { fontSize: 'L' }, updatedAt: 900 });

    const same = local(900);
    expect(await syncSettings(cloud.backend(), same)).toMatchObject({
      pulled: false,
      pushed: false,
    });
  });
});

describe('sanitizeSettings', () => {
  it('keeps valid values and drops anything malformed or not meant to sync', () => {
    expect(
      sanitizeSettings({
        language: 'my',
        themeMode: 'dark',
        fontSize: 'XL',
        reminderHour: 25,
        reminderMinute: 30,
        birthSign: 'monday',
        lessonsRead: ['a', 'a', 'b'],
        haptics: 'yes',
        name: 'Mya',
        deviceSeed: 'secret',
      }),
    ).toEqual({
      language: 'my',
      themeMode: 'dark',
      reminderMinute: 30,
      birthSign: 'monday',
      lessonsRead: ['a', 'b'],
    });
  });
});

describe('signInMethods', () => {
  it('keeps Google off iOS until Sign in with Apple is offered too (App Store 4.8)', () => {
    const google = { providers: ['google' as const], email: false };
    expect(signInMethods(google, 'android')).toEqual(google);
    expect(signInMethods(google, 'ios')).toEqual({ providers: [], email: false });
    const both = { providers: ['google' as const, 'apple' as const], email: false };
    expect(signInMethods(both, 'ios')).toEqual(both);
  });
});
