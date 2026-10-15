import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import en from '../locales/en.json';

import { CARDS, getCard } from '@/data/cards';
import { getJournalRepo, resetJournalRepo } from '@/db';
import { dailyCard } from '@/engine';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { localDateKey } from '@/utils/dates';
import { filterReadings } from '@/utils/readings';
import { stripZwsp } from '@/utils/myanmar';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/reading.png') }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

const normalizer = (s: string) => stripZwsp(s).trim();

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false });
  useDaily.setState({ dateKey: null, draw: null, loading: false });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 'seed-x' });
});

async function finishOneCardReading(question = '') {
  renderRouter('./app', { initialUrl: '/reading/one-card' });
  if (question) fireEvent.changeText(await screen.findByTestId('reading-question-input'), question);
  fireEvent.press(await screen.findByTestId('reading-start'));
  fireEvent.press(await screen.findByTestId('reading-shuffle'));
  fireEvent.press(await screen.findByTestId('fan-card-5'));
  fireEvent.press(await screen.findByTestId('reading-reveal-all', {}, { timeout: 2000 }));
  await screen.findByTestId('reading-summary');
  await waitFor(() => expect(useJournal.getState().readings).toHaveLength(1));
  return useJournal.getState().readings[0]!;
}

describe('journal', () => {
  it('saves finished readings automatically and keeps them after a restart', async () => {
    const saved = await finishOneCardReading('What do I need to hear?');
    expect(await screen.findByText(en.journal.saved)).toBeTruthy();
    expect(saved).toMatchObject({ kind: 'spread', spreadId: 'one-card', topic: 'general', question: 'What do I need to hear?' });
    expect(saved.cards).toHaveLength(1);

    // Simulate an app restart: drop in-memory state, reload from SQLite.
    useJournal.setState({ readings: [], loaded: false });
    await act(() => useJournal.getState().refresh());
    expect(useJournal.getState().readings.map((r) => r.id)).toEqual([saved.id]);
  });

  it('lists readings, opens one, edits notes and deletes it', async () => {
    const saved = await finishOneCardReading();
    const card = getCard(saved.cards[0]!.cardId)!;
    fireEvent.press(screen.getByTestId('reading-home'));
    fireEvent.press(await screen.findByTestId('tab-journal'));
    const row = await screen.findByTestId(`journal-row-${saved.id}`);
    expect(within(row).getByText(card.en.name, { normalizer })).toBeTruthy();

    fireEvent.press(row);
    expect(await screen.findByTestId('screen-journal-entry')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('journal-notes-input'), 'ဒီနေ့ စိတ်အေးချမ်းပါတယ်။');
    fireEvent.press(screen.getByTestId('journal-save-notes'));
    await waitFor(async () => {
      const repo = await getJournalRepo();
      expect((await repo.getReading(saved.id))!.notes).toBe('ဒီနေ့ စိတ်အေးချမ်းပါတယ်။');
    });

    fireEvent.press(screen.getByTestId('journal-delete'));
    fireEvent.press(await screen.findByTestId('journal-delete-confirm'));
    await waitFor(() => expect(useJournal.getState().readings).toHaveLength(0));
    const repo = await getJournalRepo();
    expect(await repo.getReading(saved.id)).toBeNull();
  });

  it('shows an empty state with no readings', async () => {
    renderRouter('./app', { initialUrl: '/journal' });
    expect(await screen.findByTestId('journal-empty')).toBeTruthy();
  });

  it('filters by topic and date', () => {
    const now = Date.UTC(2026, 9, 15);
    const day = 86400000;
    const base = { kind: 'spread' as const, spreadId: 'one-card', question: '', notes: '', cards: [], dateKey: '', updatedAt: 0 };
    const rows = [
      { ...base, id: 'a', topic: 'love' as const, createdAt: now - day },
      { ...base, id: 'b', topic: 'career' as const, createdAt: now - 10 * day },
      { ...base, id: 'c', topic: 'love' as const, createdAt: now - 100 * day },
    ];
    expect(filterReadings(rows, 'all', 'all', now).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(filterReadings(rows, 'love', 'all', now).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterReadings(rows, 'all', '7', now).map((r) => r.id)).toEqual(['a']);
    expect(filterReadings(rows, 'all', '30', now).map((r) => r.id)).toEqual(['a', 'b']);
    expect(filterReadings(rows, 'career', '7', now)).toEqual([]);
  });

  it('shares a reading as an image', async () => {
    await finishOneCardReading();
    fireEvent.press(screen.getByTestId('reading-share'));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    fireEvent.press(screen.getByTestId('share-confirm'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/reading.png', expect.objectContaining({ mimeType: 'image/png' })));
    expect(captureRef).toHaveBeenCalled();
  });
});

describe('card of the day', () => {
  it('is revealed once per day, stays the same after a restart and can be saved', async () => {
    const expected = dailyCard('seed-x', localDateKey(new Date()));
    const card = CARDS.find((c) => c.id === expected.cardId)!;

    renderRouter('./app', { initialUrl: '/home' });
    fireEvent.press(await screen.findByTestId('daily-reveal'));
    expect(await screen.findByTestId('daily-name')).toHaveTextContent(card.en.name);

    // Restart: the stored draw is loaded again.
    act(() => useDaily.setState({ dateKey: null, draw: null }));
    await act(() => useDaily.getState().load());
    expect(useDaily.getState().draw).toMatchObject({ cardId: expected.cardId, reversed: expected.reversed });

    renderRouter('./app', { initialUrl: '/daily' });
    const meaning = await screen.findByTestId('daily-meaning');
    expect(normalizer(String(meaning.props.children))).toBe(expected.reversed ? card.en.reversed : card.en.upright);

    fireEvent.press(screen.getByTestId('daily-save'));
    expect(await screen.findByTestId('daily-open-journal')).toBeTruthy();
    expect(useJournal.getState().readings[0]).toMatchObject({ kind: 'daily', cards: [{ cardId: card.id }] });
  });
});
