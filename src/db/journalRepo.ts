import { uuidV4 } from '@/utils/id';

import { TOPICS, type Topic } from '@/engine';
import { localDateKey } from '@/utils/dates';

import type { DailyDraw, Db, JournalRepo, NewReading, ReadingFilter, ReadingRecord, SavedCard, SqlValue } from './types';

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
};

function parseCards(json: string): SavedCard[] {
  try {
    const value = JSON.parse(json) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((c): c is SavedCard => !!c && typeof c.cardId === 'string' && typeof c.positionId === 'string')
      .map((c) => ({ positionId: c.positionId, cardId: c.cardId, reversed: !!c.reversed }));
  } catch {
    return [];
  }
}

const toTopic = (t: string): Topic => ((TOPICS as readonly string[]).includes(t) ? (t as Topic) : 'general');

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
      const row = await db.getFirstAsync<ReadingRow>('SELECT * FROM readings WHERE id = ? AND deleted_at IS NULL', [
        id,
      ]);
      return row ? fromRow(row) : null;
    },

    async updateNotes(id: string, notes: string) {
      await db.runAsync('UPDATE readings SET notes = ?, updated_at = ? WHERE id = ?', [notes, now(), id]);
    },

    async deleteReading(id: string) {
      const t = now();
      await db.runAsync('UPDATE readings SET deleted_at = ?, updated_at = ?, notes = ?, question = ? WHERE id = ?', [
        t,
        t,
        '',
        '',
        id,
      ]);
      await db.runAsync('UPDATE daily_draws SET reading_id = NULL WHERE reading_id = ?', [id]);
    },

    async deleteAll() {
      await db.withTransactionAsync(async () => {
        await db.execAsync('DELETE FROM readings; DELETE FROM daily_draws;');
      });
    },

    async getDailyDraw(dateKey: string) {
      const row = await db.getFirstAsync<{
        date_key: string;
        card_id: string;
        reversed: number;
        revealed_at: number;
        reading_id: string | null;
      }>('SELECT * FROM daily_draws WHERE date_key = ?', [dateKey]);
      if (!row) return null;
      return {
        dateKey: row.date_key,
        cardId: row.card_id,
        reversed: !!row.reversed,
        revealedAt: Number(row.revealed_at),
        readingId: row.reading_id,
      } satisfies DailyDraw;
    },

    async saveDailyDraw(draw) {
      // First reveal of the day wins: the Card of the Day is drawn once.
      await db.runAsync(
        'INSERT OR IGNORE INTO daily_draws (date_key, card_id, reversed, revealed_at) VALUES (?, ?, ?, ?)',
        [draw.dateKey, draw.cardId, draw.reversed ? 1 : 0, draw.revealedAt],
      );
    },

    async linkDailyReading(dateKey: string, readingId: string) {
      await db.runAsync('UPDATE daily_draws SET reading_id = ? WHERE date_key = ?', [readingId, dateKey]);
    },
  };
}
