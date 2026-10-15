import { getJournalRepo, resetJournalRepo } from '../src/db';
import { createJournalRepo } from '../src/db/journalRepo';
import { migrate, MIGRATIONS } from '../src/db/schema';
import { openSqlJsDatabase } from '../src/db/sqljsAdapter';

const cards = [
  { positionId: 'past', cardId: 'major-00-fool', reversed: false },
  { positionId: 'present', cardId: 'cups-02-two', reversed: true },
];

beforeEach(() => resetJournalRepo());

describe('journal database', () => {
  it('migrates a new database to the latest version, idempotently', async () => {
    const db = await openSqlJsDatabase();
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.map((t) => t.name).sort()).toEqual(['daily_draws', 'readings']);
  });

  it('upgrades a version-1 database: existing readings are queued for the first backup', async () => {
    const db = await openSqlJsDatabase();
    await db.execAsync(MIGRATIONS[0]!);
    await db.execAsync('PRAGMA user_version = 1');
    await db.runAsync(
      `INSERT INTO readings (id, kind, spread_id, topic, question, notes, cards, date_key, created_at, updated_at)
       VALUES ('old', 'spread', 'one-card', 'general', 'Q', '', '[]', '2026-10-01', 1, 1)`,
    );
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    const repo = createJournalRepo(db);
    expect((await repo.pendingChanges()).map((r) => r.id)).toEqual(['old']);
  });

  it('saves and reads back a reading with its cards', async () => {
    const repo = await getJournalRepo();
    const saved = await repo.saveReading({
      kind: 'spread',
      spreadId: 'three-past-present-future',
      topic: 'love',
      question: '  Where is this going?  ',
      cards,
      createdAt: Date.UTC(2026, 9, 15, 3),
    });
    expect(saved.question).toBe('Where is this going?');
    const loaded = await repo.getReading(saved.id);
    expect(loaded).toEqual(saved);
    expect(loaded!.cards[1]).toEqual({ positionId: 'present', cardId: 'cups-02-two', reversed: true });
  });

  it('keeps Burmese text intact', async () => {
    const repo = await getJournalRepo();
    const notes = 'ဒီနေ့ စိတ်ငြိမ်းချမ်းပါတယ်။ ကျေးဇူးတင်စရာ သုံးခု ရှိပါတယ်။';
    const saved = await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'general', question: 'မေးခွန်း', cards: [cards[0]!] });
    await repo.updateNotes(saved.id, notes);
    const loaded = await repo.getReading(saved.id);
    expect(loaded!.notes).toBe(notes);
    expect(loaded!.question).toBe('မေးခွန်း');
    expect(loaded!.updatedAt).toBeGreaterThanOrEqual(saved.updatedAt);
  });

  it('lists newest first and filters by topic, kind and date', async () => {
    const repo = await getJournalRepo();
    const day = 24 * 3600 * 1000;
    const base = Date.UTC(2026, 9, 1);
    await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'love', question: '', cards, createdAt: base });
    await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'career', question: '', cards, createdAt: base + day });
    await repo.saveReading({ kind: 'daily', spreadId: 'daily', topic: 'general', question: '', cards, createdAt: base + 2 * day });

    expect((await repo.listReadings()).map((r) => r.topic)).toEqual(['general', 'career', 'love']);
    expect((await repo.listReadings({ topic: 'love' })).length).toBe(1);
    expect((await repo.listReadings({ kind: 'daily' })).map((r) => r.spreadId)).toEqual(['daily']);
    expect((await repo.listReadings({ since: base + day })).length).toBe(2);
    expect((await repo.listReadings({ topic: 'all', kind: 'all' })).length).toBe(3);
  });

  it('deletes a reading (and clears its text) and can delete everything', async () => {
    const repo = await getJournalRepo();
    const a = await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'general', question: 'private', cards });
    await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'general', question: '', cards });
    await repo.deleteReading(a.id);
    expect(await repo.getReading(a.id)).toBeNull();
    expect((await repo.listReadings()).length).toBe(1);

    await repo.saveDailyDraw({ dateKey: '2026-10-15', cardId: 'major-17-star', reversed: false, revealedAt: 1 });
    await repo.deleteAll();
    expect(await repo.listReadings()).toEqual([]);
    expect(await repo.getDailyDraw('2026-10-15')).toBeNull();
  });

  it('records the daily card once per day and links it to a journal entry', async () => {
    const repo = await getJournalRepo();
    await repo.saveDailyDraw({ dateKey: '2026-10-15', cardId: 'major-17-star', reversed: true, revealedAt: 10 });
    await repo.saveDailyDraw({ dateKey: '2026-10-15', cardId: 'major-18-moon', reversed: false, revealedAt: 20 });
    const draw = await repo.getDailyDraw('2026-10-15');
    expect(draw).toEqual({ dateKey: '2026-10-15', cardId: 'major-17-star', reversed: true, revealedAt: 10, readingId: null });

    const saved = await repo.saveReading({ kind: 'daily', spreadId: 'daily', topic: 'general', question: '', cards });
    await repo.linkDailyReading('2026-10-15', saved.id);
    expect((await repo.getDailyDraw('2026-10-15'))!.readingId).toBe(saved.id);
    await repo.deleteReading(saved.id);
    expect((await repo.getDailyDraw('2026-10-15'))!.readingId).toBeNull();
  });

  it('survives corrupt card JSON', async () => {
    const db = await openSqlJsDatabase();
    await migrate(db);
    await db.runAsync(
      "INSERT INTO readings (id, kind, spread_id, topic, cards, date_key, created_at, updated_at) VALUES ('x', 'spread', 'one-card', 'weird', 'not json', '2026-01-01', 1, 1)",
    );
    const r = await createJournalRepo(db).getReading('x');
    expect(r).toMatchObject({ cards: [], topic: 'general' });
  });
});
