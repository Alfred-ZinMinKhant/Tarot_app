import { uuidV4 } from '@/utils/id';

import { TOPICS, type Topic } from '@/engine';
import { localDateKey } from '@/utils/dates';

import type {
  DailyDraw,
  Db,
  JournalRepo,
  NewReading,
  ReadingFilter,
  ReadingRecord,
  SavedCard,
  SqlValue,
  SyncRecord,
} from './types';

type DailyRow = {
  date_key: string;
  card_id: string;
  reversed: number;
  revealed_at: number;
  reading_id: string | null;
};

const toDraw = (row: DailyRow): DailyDraw => ({
  dateKey: row.date_key,
  cardId: row.card_id,
  reversed: !!row.reversed,
  revealedAt: Number(row.revealed_at),
  readingId: row.reading_id,
});

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
  deleted_at?: number | null;
};

function parseCards(json: string): SavedCard[] {
  try {
    const value = JSON.parse(json) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (c): c is SavedCard =>
          !!c && typeof c.cardId === 'string' && typeof c.positionId === 'string',
      )
      .map((c) => ({ positionId: c.positionId, cardId: c.cardId, reversed: !!c.reversed }));
  } catch {
    return [];
  }
}

const toTopic = (t: string): Topic =>
  (TOPICS as readonly string[]).includes(t) ? (t as Topic) : 'general';

function fromRow(r: ReadingRow): ReadingRecord {
  return {
    id: r.id,
    kind: r.kind === 'daily' ? 'daily' : 'spread',
    spreadId: r.spread_id,
    topic: toTopic(r.topic),
    question: r.question,
    notes: r.notes,
    cards: parseCards(r.cards),
    dateKey: r.date_key,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function toSyncRecord(r: ReadingRow): SyncRecord {
  return { ...fromRow(r), deletedAt: r.deleted_at == null ? null : Number(r.deleted_at) };
}

export function createJournalRepo(db: Db, now: () => number = Date.now): JournalRepo {
  return {
    async saveReading(input: NewReading) {
      const createdAt = input.createdAt ?? now();
      const record: ReadingRecord = {
        id: uuidV4(),
        kind: input.kind,
        spreadId: input.spreadId,
        topic: input.topic,
        question: input.question.trim(),
        notes: input.notes ?? '',
        cards: input.cards,
        dateKey: input.dateKey ?? localDateKey(new Date(createdAt)),
        createdAt,
        updatedAt: createdAt,
      };
      await db.runAsync(
        `INSERT INTO readings (id, kind, spread_id, topic, question, notes, cards, date_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.kind,
          record.spreadId,
          record.topic,
          record.question,
          record.notes,
          JSON.stringify(record.cards),
          record.dateKey,
          record.createdAt,
          record.updatedAt,
        ],
      );
      return record;
    },

    async listReadings(filter: ReadingFilter = {}) {
      const where = ['deleted_at IS NULL'];
      const params: SqlValue[] = [];
      if (filter.topic && filter.topic !== 'all') {
        where.push('topic = ?');
        params.push(filter.topic);
      }
      if (filter.kind && filter.kind !== 'all') {
        where.push('kind = ?');
        params.push(filter.kind);
      }
      if (filter.since !== undefined) {
        where.push('created_at >= ?');
        params.push(filter.since);
      }
      const rows = await db.getAllAsync<ReadingRow>(
        `SELECT * FROM readings WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
        params,
      );
      return rows.map(fromRow);
    },

    async getReading(id: string) {
      const row = await db.getFirstAsync<ReadingRow>(
        'SELECT * FROM readings WHERE id = ? AND deleted_at IS NULL',
        [id],
      );
      return row ? fromRow(row) : null;
    },

    async updateNotes(id: string, notes: string) {
      await db.runAsync('UPDATE readings SET notes = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
        notes,
        now(),
        id,
      ]);
    },

    async deleteReading(id: string) {
      const t = now();
      await db.runAsync(
        'UPDATE readings SET deleted_at = ?, updated_at = ?, notes = ?, question = ?, dirty = 1 WHERE id = ?',
        [t, t, '', '', id],
      );
      await db.runAsync('UPDATE daily_draws SET reading_id = NULL WHERE reading_id = ?', [id]);
    },

    async deleteAll() {
      await db.withTransactionAsync(async () => {
        await db.execAsync('DELETE FROM readings; DELETE FROM daily_draws;');
      });
    },

    async pendingChanges() {
      const rows = await db.getAllAsync<ReadingRow>(
        'SELECT * FROM readings WHERE dirty = 1 ORDER BY updated_at',
      );
      return rows.map(toSyncRecord);
    },

    async markSynced(rows) {
      if (!rows.length) return;
      await db.withTransactionAsync(async () => {
        for (const r of rows) {
          await db.runAsync('UPDATE readings SET dirty = 0 WHERE id = ? AND updated_at = ?', [
            r.id,
            r.updatedAt,
          ]);
        }
      });
    },

    async markAllDirty() {
      await db.runAsync('UPDATE readings SET dirty = 1');
    },

    async applyRemote(rows) {
      let changed = 0;
      await db.withTransactionAsync(async () => {
        for (const r of rows) {
          const local = await db.getFirstAsync<{ updated_at: number }>(
            'SELECT updated_at FROM readings WHERE id = ?',
            [r.id],
          );
          // Last write wins; on a tie the local copy stays (it is identical or will be uploaded).
          if (local && Number(local.updated_at) >= r.updatedAt) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO readings
               (id, kind, spread_id, topic, question, notes, cards, date_key, created_at, updated_at, deleted_at, dirty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              r.id,
              r.kind,
              r.spreadId,
              r.topic,
              r.deletedAt ? '' : r.question,
              r.deletedAt ? '' : r.notes,
              JSON.stringify(r.cards),
              r.dateKey,
              r.createdAt,
              r.updatedAt,
              r.deletedAt,
            ],
          );
          if (r.deletedAt)
            await db.runAsync('UPDATE daily_draws SET reading_id = NULL WHERE reading_id = ?', [
              r.id,
            ]);
          changed++;
        }
      });
      return changed;
    },

    async getDailyDraw(dateKey: string) {
      const row = await db.getFirstAsync<DailyRow>('SELECT * FROM daily_draws WHERE date_key = ?', [
        dateKey,
      ]);
      return row ? toDraw(row) : null;
    },

    async listDailyDraws() {
      const rows = await db.getAllAsync<DailyRow>('SELECT * FROM daily_draws ORDER BY date_key');
      return rows.map(toDraw);
    },

    async applyRemoteDraws(draws) {
      let changed = 0;
      await db.withTransactionAsync(async () => {
        for (const d of draws) {
          const local = await db.getFirstAsync<DailyRow>(
            'SELECT * FROM daily_draws WHERE date_key = ?',
            [d.dateKey],
          );
          // Only link to a journal entry that exists here and isn't deleted.
          const linkable =
            d.readingId &&
            (await db.getFirstAsync<{ id: string }>(
              'SELECT id FROM readings WHERE id = ? AND deleted_at IS NULL',
              [d.readingId],
            ));
          const readingId = linkable ? d.readingId : null;
          if (!local) {
            await db.runAsync(
              'INSERT INTO daily_draws (date_key, card_id, reversed, revealed_at, reading_id) VALUES (?, ?, ?, ?, ?)',
              [d.dateKey, d.cardId, d.reversed ? 1 : 0, d.revealedAt, readingId],
            );
            changed++;
          } else if (!local.reading_id && readingId) {
            await db.runAsync('UPDATE daily_draws SET reading_id = ? WHERE date_key = ?', [
              readingId,
              d.dateKey,
            ]);
            changed++;
          }
        }
      });
      return changed;
    },

    async saveDailyDraw(draw) {
      // First reveal of the day wins: the Card of the Day is drawn once.
      await db.runAsync(
        'INSERT OR IGNORE INTO daily_draws (date_key, card_id, reversed, revealed_at) VALUES (?, ?, ?, ?)',
        [draw.dateKey, draw.cardId, draw.reversed ? 1 : 0, draw.revealedAt],
      );
    },

    async linkDailyReading(dateKey: string, readingId: string) {
      await db.runAsync('UPDATE daily_draws SET reading_id = ? WHERE date_key = ?', [
        readingId,
        dateKey,
      ]);
    },
  };
}
