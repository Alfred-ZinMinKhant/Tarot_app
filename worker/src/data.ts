import type { Env } from './types';
import { HttpError, json, readJson } from './util';

const bad = (what: string): never => {
  throw new HttpError(400, `Invalid ${what}`);
};
const text = (v: unknown, max: number, what: string): string =>
  typeof v === 'string' && v.length <= max ? v : bad(what);
const int = (v: unknown, what: string): number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : bad(what);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 500;

type Obj = Record<string, unknown>;
const obj = (v: unknown, what: string): Obj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : bad(what);
const list = (v: unknown, max: number, what: string): unknown[] =>
  Array.isArray(v) && v.length <= max ? v : bad(what);

/* ------------------------------ journal readings ------------------------------ */

type ReadingRow = {
  id: string;
  kind: string;
  spread_id: string;
  topic: string;
  question: string;
  notes: string;
  cards: string;
  date_key: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  server_updated_at: string;
};

export async function pullReadings(url: URL, env: Env, userId: string): Promise<Response> {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || MAX_ROWS, 1), MAX_ROWS);
  const at = url.searchParams.get('at');
  const id = url.searchParams.get('id') ?? '';
  const feed = at
    ? env.DB.prepare(
        `SELECT * FROM journal_readings WHERE user_id = ?1
           AND (server_updated_at > ?2 OR (server_updated_at = ?2 AND id > ?3))
         ORDER BY server_updated_at, id LIMIT ?4`,
      ).bind(userId, at, id, limit)
    : env.DB.prepare(
        'SELECT * FROM journal_readings WHERE user_id = ?1 ORDER BY server_updated_at, id LIMIT ?2',
      ).bind(userId, limit);
  const { results } = await feed.all<ReadingRow>();
  const last = results[results.length - 1];
  return json({
    rows: results.map((r) => ({
      id: r.id,
      kind: r.kind,
      spreadId: r.spread_id,
      topic: r.topic,
      question: r.question,
      notes: r.notes,
      cards: JSON.parse(r.cards) as unknown,
      dateKey: r.date_key,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    })),
    cursor: last ? { at: last.server_updated_at, id: last.id } : null,
  });
}

function parseReading(value: unknown): Obj {
  const r = obj(value, 'row');
  if (r.kind !== 'spread' && r.kind !== 'daily') bad('kind');
  const deletedAt = r.deletedAt == null ? null : int(r.deletedAt, 'deletedAt');
  const cards = list(r.cards, 40, 'cards');
  if (JSON.stringify(cards).length > 20_000) bad('cards');
  const dateKey = text(r.dateKey, 10, 'dateKey');
  if (!DATE_KEY.test(dateKey)) bad('dateKey');
  const question = text(r.question, 10_000, 'question');
  const notes = text(r.notes, 20_000, 'notes');
  return {
    id: text(r.id, 64, 'id'),
    kind: r.kind,
    spreadId: text(r.spreadId, 64, 'spreadId'),
    topic: text(r.topic, 64, 'topic'),
    // A deleted reading keeps no text, only the tombstone.
    question: deletedAt === null ? question : '',
    notes: deletedAt === null ? notes : '',
    cards,
    dateKey,
    createdAt: int(r.createdAt, 'createdAt'),
    updatedAt: int(r.updatedAt, 'updatedAt'),
    deletedAt,
  };
}

/**
 * One statement for the whole batch (json_each), whatever its size. Last write wins on the
 * device-clock `updated_at`, so a device that was offline for a week can't undo newer edits.
 */
export async function pushReadings(req: Request, env: Env, userId: string): Promise<Response> {
  const rows = list(obj(await readJson(req), 'body').rows, MAX_ROWS, 'rows').map(parseReading);
  if (rows.length) {
    await env.DB.prepare(
      `INSERT INTO journal_readings
         (user_id, id, kind, spread_id, topic, question, notes, cards, date_key,
          created_at, updated_at, deleted_at, server_updated_at)
       SELECT ?1, json_extract(j.value, '$.id'), json_extract(j.value, '$.kind'),
              json_extract(j.value, '$.spreadId'), json_extract(j.value, '$.topic'),
              json_extract(j.value, '$.question'), json_extract(j.value, '$.notes'),
              json_extract(j.value, '$.cards'), json_extract(j.value, '$.dateKey'),
              json_extract(j.value, '$.createdAt'), json_extract(j.value, '$.updatedAt'),
              json_extract(j.value, '$.deletedAt'), ?2
       FROM json_each(?3) AS j WHERE true
       ON CONFLICT (user_id, id) DO UPDATE SET
         kind = excluded.kind, spread_id = excluded.spread_id, topic = excluded.topic,
         question = excluded.question, notes = excluded.notes, cards = excluded.cards,
         date_key = excluded.date_key, created_at = excluded.created_at,
         updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
         server_updated_at = excluded.server_updated_at
       WHERE excluded.updated_at > journal_readings.updated_at`,
    )
      .bind(userId, new Date().toISOString(), JSON.stringify(rows))
      .run();
  }
  return json({ ok: true });
}

/* ------------------------------- daily draws ------------------------------- */

export async function pullDraws(env: Env, userId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT date_key, card_id, reversed, revealed_at, reading_id FROM daily_draws WHERE user_id = ?1 ORDER BY date_key LIMIT 5000',
  )
    .bind(userId)
    .all<{ date_key: string; card_id: string; reversed: number; revealed_at: number; reading_id: string | null }>();
  return json({
    draws: results.map((r) => ({
      dateKey: r.date_key,
      cardId: r.card_id,
      reversed: !!r.reversed,
      revealedAt: r.revealed_at,
      readingId: r.reading_id,
    })),
  });
}

function parseDraw(value: unknown): Obj {
  const d = obj(value, 'draw');
  const dateKey = text(d.dateKey, 10, 'dateKey');
  if (!DATE_KEY.test(dateKey)) bad('dateKey');
  if (typeof d.reversed !== 'boolean') bad('reversed');
  return {
    dateKey,
    cardId: text(d.cardId, 64, 'cardId'),
    reversed: d.reversed,
    revealedAt: int(d.revealedAt, 'revealedAt'),
    readingId: d.readingId == null ? null : text(d.readingId, 64, 'readingId'),
  };
}

/** The first reveal of a day wins; later pushes can only add a missing journal link. */
export async function pushDraws(req: Request, env: Env, userId: string): Promise<Response> {
  const draws = list(obj(await readJson(req), 'body').draws, MAX_ROWS, 'draws').map(parseDraw);
  if (draws.length) {
    await env.DB.prepare(
      `INSERT INTO daily_draws (user_id, date_key, card_id, reversed, revealed_at, reading_id)
       SELECT ?1, json_extract(j.value, '$.dateKey'), json_extract(j.value, '$.cardId'),
              json_extract(j.value, '$.reversed'), json_extract(j.value, '$.revealedAt'),
              json_extract(j.value, '$.readingId')
       FROM json_each(?2) AS j WHERE true
       ON CONFLICT (user_id, date_key) DO UPDATE SET
         reading_id = COALESCE(excluded.reading_id, daily_draws.reading_id)`,
    )
      .bind(userId, JSON.stringify(draws))
      .run();
  }
  return json({ ok: true });
}

/* -------------------------------- settings -------------------------------- */

export async function pullSettings(env: Env, userId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT data, updated_at FROM user_settings WHERE user_id = ?1')
    .bind(userId)
    .first<{ data: string; updated_at: number }>();
  return json({ settings: row ? { data: JSON.parse(row.data) as unknown, updatedAt: row.updated_at } : null });
}

export async function pushSettings(req: Request, env: Env, userId: string): Promise<Response> {
  const body = obj(await readJson(req, 100_000), 'body');
  const data = JSON.stringify(obj(body.data, 'data'));
  if (data.length > 50_000) bad('data');
  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, data, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
     WHERE excluded.updated_at > user_settings.updated_at`,
  )
    .bind(userId, data, int(body.updatedAt, 'updatedAt'))
    .run();
  return json({ ok: true });
}

/* --------------------------------- account --------------------------------- */

/** Removes the account and everything stored for it (App Store / Play account-deletion rule). */
export async function deleteAccount(env: Env, userId: string): Promise<Response> {
  const del = (table: string, column = 'user_id') =>
    env.DB.prepare(`DELETE FROM ${table} WHERE ${column} = ?1`).bind(userId);
  await env.DB.batch([
    del('journal_readings'),
    del('daily_draws'),
    del('user_settings'),
    del('sessions'),
    del('auth_codes'),
    del('users', 'id'),
  ]);
  return json({ deleted: true });
}
