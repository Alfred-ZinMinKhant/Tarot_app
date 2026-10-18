import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';

import en from '../locales/en.json';
import { played } from '../test/mocks/expoAudio';

import { getSign, LESSONS } from '@/data/content';
import { getJournalRepo, resetJournalRepo } from '@/db';
import { buildExport } from '@/services/userData';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { stripZwsp } from '@/utils/myanmar';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

const mockWritten: Record<string, string> = {};
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    constructor(_dir: unknown, fileName: string) {
      this.name = fileName;
      this.uri = `file:///cache/${fileName}`;
    }
    get exists() {
      return this.name in mockWritten;
    }
    delete() {
      delete mockWritten[this.name];
    }
    create() {
      mockWritten[this.name] = '';
    }
    write(content: string) {
      mockWritten[this.name] = content;
    }
  }
  return { File, Paths: { cache: {} } };
});

const normalizer = (s: string) => stripZwsp(s).trim();

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false });
  useDaily.setState({ dateKey: null, draw: null, loading: false });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', haptics: false, deviceSeed: 'seed-x' });
  played.length = 0;
});

describe('onboarding', () => {
  it('walks through three steps and saves name and sign', async () => {
    const r = renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-disclaimer')).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 4')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('onboarding-language-step')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('onboarding-about-you')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('onboarding-name'), 'Su Su');
    fireEvent.press(screen.getByTestId('onboarding-toggle-weekday'));
    fireEvent.press(screen.getByTestId('onboarding-sign-rahu'));
    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(r.getPathname()).toBe('/home');
    expect(useSettings.getState()).toMatchObject({ hasOnboarded: true, name: 'Su Su', birthSign: 'rahu' });
    expect(await screen.findByText(/, Su Su$/, { normalizer })).toBeTruthy();
    expect(screen.getByTestId('home-sign-mood')).toBeTruthy();
  });

  it('a birth date gives the weekday sign, then step 4 collects time and place for the chart', async () => {
    const r = renderRouter('./app', { initialUrl: '/about-you' });
    fireEvent.changeText(await screen.findByTestId('onboarding-day'), '16');
    fireEvent.changeText(screen.getByTestId('onboarding-month'), '5');
    fireEvent.changeText(screen.getByTestId('onboarding-year'), '1990'); // a Wednesday
    fireEvent(await screen.findByTestId('onboarding-afternoon'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(await screen.findByTestId('onboarding-your-chart')).toBeTruthy();
    expect(screen.getByLabelText('Step 4 of 4')).toBeTruthy();
    expect(useSettings.getState()).toMatchObject({ hasOnboarded: false, birthSign: 'rahu' });
    expect(screen.getByTestId('chart-day').props.value).toBe('16');
    expect(screen.getByTestId('chart-year').props.value).toBe('1990');

    fireEvent.changeText(screen.getByTestId('chart-hour'), '14');
    fireEvent.changeText(screen.getByTestId('chart-place'), 'Yangon');
    fireEvent.press(await screen.findByTestId('chart-place-Yangon'));
    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(await screen.findByTestId('chart-result')).toBeTruthy();
    expect(r.getPathname()).toBe('/birth-chart');
    expect(useSettings.getState().hasOnboarded).toBe(true);
    expect(useSettings.getState().birth).toMatchObject({ date: '1990-05-16', time: '14:00' });
  });

  it('skipping the chart step still finishes onboarding and keeps the Home nudge', async () => {
    renderRouter('./app', { initialUrl: '/your-chart?date=1990-05-16' });
    fireEvent.press(await screen.findByTestId('onboarding-skip'));
    expect(await screen.findByTestId('home-chart-nudge')).toBeTruthy();
    expect(useSettings.getState()).toMatchObject({ hasOnboarded: true, birth: null });
  });

  it('asks for a place before saving the chart', async () => {
    renderRouter('./app', { initialUrl: '/your-chart?date=1990-05-16' });
    fireEvent.changeText(await screen.findByTestId('chart-hour'), '14');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('chart-error')).toBeTruthy();
    expect(useSettings.getState().hasOnboarded).toBe(false);
  });

  it('rejects an impossible date without leaving the step', async () => {
    renderRouter('./app', { initialUrl: '/about-you' });
    fireEvent.changeText(await screen.findByTestId('onboarding-day'), '31');
    fireEvent.changeText(screen.getByTestId('onboarding-month'), '2');
    fireEvent.changeText(screen.getByTestId('onboarding-year'), '1990');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('onboarding-date-error')).toBeTruthy();
    expect(useSettings.getState().hasOnboarded).toBe(false);
  });

  it('shows a dismissible chart card on Home until a chart exists', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/home' });
    expect(await screen.findByTestId('home-chart-nudge')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-chart-nudge-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('home-chart-nudge')).toBeNull());
    expect(useSettings.getState().chartNudgeDismissed).toBe(true);
  });

  it('skipping the last step keeps nothing', async () => {
    renderRouter('./app', { initialUrl: '/about-you' });
    fireEvent.changeText(await screen.findByTestId('onboarding-name'), 'Ko Ko');
    fireEvent.changeText(screen.getByTestId('onboarding-year'), '1990');
    fireEvent.press(screen.getByTestId('onboarding-skip'));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(useSettings.getState()).toMatchObject({ hasOnboarded: true, name: '', birthSign: null });
    expect(screen.getByTestId('home-sign-empty')).toBeTruthy();
  });
});

describe('weekday sign screen', () => {
  it('finds the sign from a birth date (Burmese digits accepted)', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/sign' });
    fireEvent.press(await screen.findByTestId('sign-picker-open-finder'));
    fireEvent.changeText(screen.getByTestId('sign-picker-day'), '၁၆');
    fireEvent.changeText(screen.getByTestId('sign-picker-month'), '5');
    fireEvent.changeText(screen.getByTestId('sign-picker-year'), '1990');
    fireEvent(screen.getByTestId('sign-picker-afternoon'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('sign-picker-find'));
    await waitFor(() => expect(useSettings.getState().birthSign).toBe('rahu'));
    expect(await screen.findByTestId('sign-name')).toHaveTextContent(getSign('rahu')!.en.name);
  });

  it('rejects impossible dates', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/sign' });
    fireEvent.press(await screen.findByTestId('sign-picker-open-finder'));
    fireEvent.changeText(screen.getByTestId('sign-picker-day'), '31');
    fireEvent.changeText(screen.getByTestId('sign-picker-month'), '2');
    fireEvent.changeText(screen.getByTestId('sign-picker-year'), '2001');
    fireEvent.press(screen.getByTestId('sign-picker-find'));
    expect(await screen.findByText(en.sign.dateInvalid)).toBeTruthy();
    expect(useSettings.getState().birthSign).toBeNull();
  });

  it('explores other signs without changing yours', async () => {
    useSettings.setState({ hasOnboarded: true, birthSign: 'friday' });
    renderRouter('./app', { initialUrl: '/sign' });
    expect(await screen.findByTestId('sign-name')).toHaveTextContent(getSign('friday')!.en.name);
    fireEvent.press(screen.getByTestId('sign-explore-saturday'));
    expect(screen.getByTestId('sign-name')).toHaveTextContent(getSign('saturday')!.en.name);
    expect(useSettings.getState().birthSign).toBe('friday');
    fireEvent.press(screen.getByTestId('sign-set-mine'));
    expect(useSettings.getState().birthSign).toBe('saturday');
  });
});

describe('learn', () => {
  it('lists lessons, tracks progress and moves to the next lesson', async () => {
    useSettings.setState({ hasOnboarded: true });
    const r = renderRouter('./app', { initialUrl: '/learn' });
    expect(await screen.findByTestId('learn-progress')).toHaveTextContent(`0 of ${LESSONS.length} lessons finished`);
    fireEvent.press(screen.getByTestId(`learn-lesson-${LESSONS[0]!.id}`));
    expect(await screen.findByTestId(`screen-lesson-${LESSONS[0]!.id}`)).toBeTruthy();
    expect(screen.getByText(LESSONS[0]!.en.sections[0]!.heading, { normalizer })).toBeTruthy();
    fireEvent.press(screen.getByTestId('lesson-finish'));
    expect(await screen.findByTestId(`screen-lesson-${LESSONS[1]!.id}`)).toBeTruthy();
    expect(r.getPathname()).toBe(`/learn/${LESSONS[1]!.id}`);
    expect(useSettings.getState().lessonsRead).toEqual([LESSONS[0]!.id]);
  });

  it('shows a friendly message for an unknown lesson', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/learn/nope' });
    expect(await screen.findByText(en.learn.notFound)).toBeTruthy();
  });
});

describe('settings: data, sound and legal', () => {
  async function seedReading() {
    const repo = await getJournalRepo();
    await repo.saveReading({
      kind: 'spread',
      spreadId: 'one-card',
      topic: 'general',
      question: 'Q',
      cards: [{ positionId: 'focus', cardId: 'major-00-fool', reversed: false }],
      dateKey: '2026-10-15',
    });
    await useJournal.getState().refresh();
  }

  it('exports readings and settings as JSON without the device seed', async () => {
    useSettings.setState({ hasOnboarded: true, name: 'Mya', birthSign: 'monday' });
    await seedReading();
    const data = await buildExport(new Date(2026, 9, 15));
    expect(data).toMatchObject({ format: 'nat-tarot-export', profile: { name: 'Mya', birthSign: 'monday' } });
    expect(data.readings).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('seed-x');

    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-export'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const [uri, opts] = (Sharing.shareAsync as jest.Mock).mock.calls.at(-1)!;
    expect(uri).toMatch(/^file:\/\/\/cache\/nat-tarot-\d{4}-\d{2}-\d{2}\.json$/);
    expect(opts).toMatchObject({ mimeType: 'application/json' });
    const file = JSON.parse(Object.values(mockWritten).at(-1)!);
    expect(file.readings[0].question).toBe('Q');
  });

  it('deletes all data after confirmation and returns to onboarding', async () => {
    useSettings.setState({ hasOnboarded: true, name: 'Mya', birthSign: 'monday', lessonsRead: ['what-is-tarot'] });
    await seedReading();
    const r = renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-delete-data'));
    fireEvent.press(await screen.findByTestId('delete-data-confirm'));
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
    expect(r.getPathname()).toBe('/welcome');
    const s = useSettings.getState();
    expect(s).toMatchObject({ hasOnboarded: false, name: '', birthSign: null, lessonsRead: [], deviceSeed: null });
    expect(useJournal.getState().readings).toEqual([]);
    expect(await (await getJournalRepo()).listReadings()).toEqual([]);
  });

  it('the sound toggle is off by default and can be turned on', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/settings' });
    expect(useSettings.getState().soundEnabled).toBe(false);
    fireEvent(await screen.findByTestId('toggle-sound'), 'valueChange', true);
    expect(useSettings.getState().soundEnabled).toBe(true);
  });

  it.each([
    [false, 0],
    [true, 1],
  ])('with sound %s, revealing the daily card plays %i sound(s)', async (soundEnabled, count) => {
    useSettings.setState({ hasOnboarded: true, soundEnabled });
    renderRouter('./app', { initialUrl: '/daily' });
    fireEvent.press(await screen.findByTestId('daily-reveal-button'));
    await screen.findByTestId('daily-title');
    expect(played).toHaveLength(count);
  });

  it('opens the privacy policy and terms', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-privacy'));
    expect(await screen.findByTestId('screen-legal-privacy')).toBeTruthy();
    expect(screen.getByText('Privacy Policy', { normalizer })).toBeTruthy();
    expect(screen.queryByText(/\{appName\}/)).toBeNull();
  });

  it('About shows the disclaimer and art credit', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/about' });
    expect(await screen.findByTestId('about-disclaimer')).toBeTruthy();
    expect(screen.getByText(/Pamela Colman Smith and published in 1909/, { normalizer })).toBeTruthy();
  });
});
