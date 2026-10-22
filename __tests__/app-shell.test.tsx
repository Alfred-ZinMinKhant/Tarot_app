import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import en from '../locales/en.json';
import my from '../locales/my.json';

import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { stripZwsp } from '@/utils/myanmar';

/** Text queries must ignore the zero-width spaces AppText adds for Burmese wrapping. */
const normalizer = (s: string) => stripZwsp(s).trim();
const text = (s: string) => screen.findByText(s, { normalizer });

beforeEach(() => {
  // Start every test in English, independent of the machine's locale.
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en' });
});

describe('app shell', () => {
  it('shows onboarding first, and the language switch changes strings instantly', async () => {
    renderRouter('./app', { initialUrl: '/' });
    expect(await text(en.common.continue)).toBeTruthy();

    fireEvent.press(screen.getByTestId('onboarding-language-my'));
    expect(await text(my.common.continue)).toBeTruthy();
    expect(await text(my.disclaimer.short)).toBeTruthy();
    expect(screen.queryByText(en.common.continue)).toBeNull();

    fireEvent.press(screen.getByTestId('onboarding-language-en'));
    expect(await text(en.common.continue)).toBeTruthy();
  });

  it('skipping onboarding lands on Home with tabs', async () => {
    const r = renderRouter('./app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('onboarding-skip'));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(r.getPathname()).toBe('/home');
    expect(useSettings.getState().hasOnboarded).toBe(true);
  });

  it('switching language in Settings updates the tab bar and screen', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('screen-settings')).toBeTruthy();
    expect(screen.getAllByText(en.settings.title, { normalizer }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.tabs.home, { normalizer }).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('settings-language-my'));
    expect(await text(my.settings.appearance)).toBeTruthy();
    expect(screen.getAllByText(my.tabs.home, { normalizer }).length).toBeGreaterThan(0);
    expect(screen.queryByText(en.settings.appearance)).toBeNull();
    expect(screen.queryByText(en.tabs.journal)).toBeNull();
  });

  it('Burmese numerals toggle updates numbers', async () => {
    useSettings.setState({ hasOnboarded: true });
    renderRouter('./app', { initialUrl: '/settings' });
    expect((await screen.findByTestId('numeral-preview'))).toHaveTextContent('1909 · 78');
    fireEvent(screen.getByTestId('toggle-burmese-numerals'), 'valueChange', true);
    expect(await screen.findByTestId('numeral-preview')).toHaveTextContent('၁၉၀၉ · ၇၈');
  });
});
