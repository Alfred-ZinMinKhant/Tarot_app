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

  it('offers work, money, week and month choices that map to a matching spread', async () => {
    renderRouter('./app', { initialUrl: '/guide' });
    fireEvent.press(await screen.findByTestId('guide-answer-career'));
    expect((await screen.findByTestId('guide-spread-name')).props.children).toBe('Situation · Challenge · Advice');
    fireEvent.press(screen.getByTestId('guide-back'));
    fireEvent.press(await screen.findByTestId('guide-answer-week'));
    expect((await screen.findByTestId('guide-spread-name')).props.children).toBe('Week Ahead');
    fireEvent.press(screen.getByTestId('guide-back'));
    fireEvent.press(await screen.findByTestId('guide-answer-month'));
    expect((await screen.findByTestId('guide-spread-name')).props.children).toBe('Month Ahead');
  });

  it('suggests a matching topic when the typed question is about work', async () => {
    renderRouter('./app', { initialUrl: '/reading/one-card' });
    expect(screen.queryByTestId('reading-topic-suggest')).toBeNull();
    fireEvent.changeText(await screen.findByTestId('reading-question-input'), 'Should I quit my job?');
    fireEvent.press(await screen.findByTestId('reading-topic-suggest'));
    expect(screen.queryByTestId('reading-topic-suggest')).toBeNull();
  });
});
