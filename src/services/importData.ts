import { getCard } from '@/data/cards';
import type { ReadingRecord, SavedCard } from '@/db/types';
import { getJournalRepo } from '@/db';
import { type Topic, TOPICS } from '@/engine';
import { useJournal } from '@/store/journal';

import { EXPORT_FORMAT, EXPORT_VERSION } from './userData';

/** Backups bigger than this are refused before parsing (a real journal is a few hundred KB). */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_READINGS = 20000;
const MAX_TEXT = 10000;

export type ImportErrorCode = 'tooBig' | 'notJson' | 'notBackup' | 'newerVersion';

export class ImportError extends Error {
  constructor(readonly code: ImportErrorCode) {
    super(code);
  }
}

export type ParsedBackup = { readings: ReadingRecord[]; skipped: number };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isTopic = (v: unknown): v is Topic => typeof v === 'string' && (TOPICS as readonly string[]).includes(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const text = (v: unknown): string | null => (typeof v === 'string' && v.length <= MAX_TEXT ? v : null);

function parseCards(value: unknown): SavedCard[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;
  const cards: SavedCard[] = [];
  for (const c of value) {
    if (!isObject(c) || typeof c.positionId !== 'string' || typeof c.cardId !== 'string') return null;
    if (!getCard(c.cardId)) return null;
    cards.push({ positionId: c.positionId, cardId: c.cardId, reversed: c.reversed === true });
  }
  return cards;
}

/** Returns a clean reading, or null when the row isn't usable (nothing from the file is trusted). */
function parseReading(row: unknown): ReadingRecord | null {
  if (!isObject(row)) return null;
  const { id, kind, spreadId, dateKey, createdAt, updatedAt } = row;
  const question = text(row.question);
  const notes = text(row.notes);
  const cards = parseCards(row.cards);
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
  if (kind !== 'spread' && kind !== 'daily') return null;
  if (typeof spreadId !== 'string' || spreadId.length === 0 || spreadId.length > 64) return null;
  if (question === null || notes === null || !cards) return null;
  if (!isTime(createdAt) || !isTime(updatedAt)) return null;
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  return {
    id,
    kind,
    spreadId,
    topic: isTopic(row.topic) ? row.topic : 'general',
    question,
    notes,
    cards,
    dateKey,
    createdAt,
    updatedAt,
  };
}

/** Checks that `json` is a Mingalar Tarot export and extracts its readings, dropping bad rows. */
export function parseBackup(json: string): ParsedBackup {
  if (json.length > MAX_BACKUP_BYTES) throw new ImportError('tooBig');
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError('notJson');
  }
  if (!isObject(data) || data.format !== EXPORT_FORMAT || !Array.isArray(data.readings)) {
    throw new ImportError('notBackup');
  }
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    throw new ImportError('newerVersion');
  }
  const rows = data.readings.slice(0, MAX_READINGS);
  const readings = rows.map(parseReading).filter((r): r is ReadingRecord => !!r);
  return { readings, skipped: data.readings.length - readings.length };
}

export type ImportResult = { added: number; skipped: number };

/** Adds the backup's readings to the journal. Nothing already here is deleted or overwritten by older data. */
export async function importBackup(json: string): Promise<ImportResult> {
  const { readings, skipped } = parseBackup(json);
  const repo = await getJournalRepo();
  const added = await repo.importReadings(readings);
  if (added > 0) {
    await useJournal.getState().refresh();
    // Lets cloud backup (when signed in) upload what was just added.
    useJournal.setState((s) => ({ localChanges: s.localChanges + 1 }));
  }
  return { added, skipped };
}
