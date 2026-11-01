import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { resetJournalRepo } from '@/db';
import { useJournal } from '@/store/journal';
import { useReadingDraft } from '@/store/readingDraft';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';

beforeEach(() => {
  useReadingDraft.setState({ draft: null });
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
});

describe('guided reading chooser', () => {
  it('opens from the home screen', async () => {
    renderRouter('./app', { initialUrl: '/home' });
    fireEvent.press(await screen.findByTestId('home-guide-open'));
    expect(await screen.findByTestId('screen-guide')).toBeTruthy();
  });

  it('suggests a spread for an answer, lets you go back, and starts the reading', async () => {
    renderRouter('./app', { initialUrl: '/guide' });
    fireEvent.press(await screen.findByTestId('guide-answer-quick'));
    expect((await screen.findByTestId('guide-spread-name')).props.children).toBe('One Card');

    fireEvent.press(screen.getByTestId('guide-back'));
    fireEvent.press(await screen.findByTestId('guide-answer-situation'));
    expect((await screen.findByTestId('guide-spread-name')).props.children).toBe('Situation · Challenge · Advice');

    fireEvent.press(screen.getByTestId('guide-start'));
    expect(await screen.findByTestId('screen-reading')).toBeTruthy();
  });
});
