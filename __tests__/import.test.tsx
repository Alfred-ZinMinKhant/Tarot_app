import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import en from '../locales/en.json';

import { getJournalRepo, resetJournalRepo } from '@/db';
import type { ReadingRecord } from '@/db/types';
import { pickBackupFile } from '@/services/pickBackup';
import { ImportError, importBackup, parseBackup } from '@/services/importData';
import { buildExport, EXPORT_FORMAT } from '@/services/userData';
import { useJournal } from '@/store/journal';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';

jest.mock('@/services/pickBackup', () => ({ pickBackupFile: jest.fn() }));

const reading = (over: Partial<ReadingRecord> = {}): ReadingRecord => ({
  id: 'r1',
  kind: 'spread',
  spreadId: 'one-card',
  topic: 'love',
  question: 'Q',
  notes: 'N',
  cards: [{ positionId: 'one', cardId: 'major-00-fool', reversed: true }],
  dateKey: '2026-10-01',
  createdAt: 1_000,
  updatedAt: 1_000,
  ...over,
});

const backup = (readings: unknown[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ format: EXPORT_FORMAT, version: 1, readings, ...over });

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false });
  jest.mocked(pickBackupFile).mockReset();
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ImportError ? e.code : 'other';
  }
  return null;
};

describe('parseBackup', () => {
  it('reads a real export back', async () => {
    const repo = await getJournalRepo();
    const saved = await repo.saveReading({ kind: 'spread', spreadId: 'one-card', topic: 'love', question: 'Hi', cards: [{ positionId: 'one', cardId: 'major-00-fool', reversed: false }] });
    const { readings, skipped } = parseBackup(JSON.stringify(await buildExport()));
    expect(skipped).toBe(0);
    expect(readings).toEqual([saved]);
  });

  it('refuses files that are not a backup', () => {
    expect(code(() => parseBackup('nope'))).toBe('notJson');
    expect(code(() => parseBackup('{"readings":[]}'))).toBe('notBackup');
    expect(code(() => parseBackup(backup([], { format: 'other' })))).toBe('notBackup');
    expect(code(() => parseBackup(backup([], { version: 99 })))).toBe('newerVersion');
    expect(code(() => parseBackup('x'.repeat(11 * 1024 * 1024)))).toBe('tooBig');
  });

  it('drops unusable rows instead of trusting them, and counts them', () => {
    const good = reading();
    const bad = [
      null,
      'text',
      { ...good, id: '' },
      { ...good, kind: 'tarot' },
      { ...good, cards: [{ positionId: 'one', cardId: 'no-such-card', reversed: false }] },
      { ...good, cards: [] },
      { ...good, dateKey: 'yesterday' },
      { ...good, createdAt: 'now' },
      { ...good, question: 'x'.repeat(10001) },
    ];
    const { readings, skipped } = parseBackup(backup([good, ...bad]));
    expect(readings).toEqual([good]);
    expect(skipped).toBe(bad.length);
  });

  it('falls back to the general topic and strips unknown fields', () => {
    const { readings } = parseBackup(backup([{ ...reading(), topic: 'wealth', extra: '<script>' }]));
    expect(readings[0]!.topic).toBe('general');
    expect(readings[0]).not.toHaveProperty('extra');
  });
});

describe('importBackup', () => {
  it('adds readings, flags them for upload and is safe to run twice', async () => {
    const json = backup([reading(), reading({ id: 'r2', createdAt: 2_000, updatedAt: 2_000 })]);
    await expect(importBackup(json)).resolves.toEqual({ added: 2, skipped: 0 });
    expect(useJournal.getState().readings.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    expect(useJournal.getState().localChanges).toBe(1);
    const repo = await getJournalRepo();
    expect((await repo.pendingChanges()).map((r) => r.id).sort()).toEqual(['r1', 'r2']);

    await expect(importBackup(json)).resolves.toEqual({ added: 0, skipped: 0 });
    expect(useJournal.getState().localChanges).toBe(1);
  });

  it('never replaces a newer local copy with an older one', async () => {
    const repo = await getJournalRepo();
    await repo.importReadings([reading({ notes: 'new', updatedAt: 5_000 })]);
    await importBackup(backup([reading({ notes: 'old', updatedAt: 1_000 })]));
    expect((await repo.getReading('r1'))?.notes).toBe('new');
    await expect(importBackup(backup([reading({ notes: 'newest', updatedAt: 9_000 })]))).resolves.toMatchObject({ added: 1 });
    expect((await repo.getReading('r1'))?.notes).toBe('newest');
  });

  it('does not bring back a reading that was deleted here later', async () => {
    const repo = await getJournalRepo();
    await repo.importReadings([reading()]);
    await repo.deleteReading('r1');
    await expect(importBackup(backup([reading()]))).resolves.toMatchObject({ added: 0 });
    expect(await repo.getReading('r1')).toBeNull();
  });
});

describe('Settings → Restore from a backup file', () => {
  const open = async () => {
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-import'));
  };
  const toastText = () => useToast.getState().current?.text;

  it('restores the chosen file and says how many readings were added', async () => {
    jest.mocked(pickBackupFile).mockResolvedValue(backup([reading()]));
    await open();
    await waitFor(() => expect(toastText()).toBe(en.settings.importDone.replace('{{n}}', '1')));
    expect(useJournal.getState().readings).toHaveLength(1);
  });

  it('does nothing when the picker is cancelled', async () => {
    jest.mocked(pickBackupFile).mockResolvedValue(null);
    await open();
    await waitFor(() => expect(pickBackupFile).toHaveBeenCalled());
    expect(toastText()).toBeUndefined();
  });

  it('explains when the file is not a backup', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(pickBackupFile).mockResolvedValue('{"hello":1}');
    await open();
    await waitFor(() => expect(toastText()).toContain("isn't a"));
    jest.restoreAllMocks();
  });
});
