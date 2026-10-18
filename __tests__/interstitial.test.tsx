import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import en from '../locales/en.json';
import { FakeAds } from '../test/mocks/fakeAds';
import { FakePurchases } from '../test/mocks/fakePurchases';

import { INTERSTITIAL_RULES, interstitialDue, type Pacing } from '@/ads/pacing';
import { resetJournalRepo } from '@/db';
import { monthKey } from '@/premium/features';
import { useAdPacing } from '@/store/adPacing';
import { setAdsService, useAds } from '@/store/ads';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { setPurchasesService, usePremium } from '@/store/premium';
import { useReadingDraft } from '@/store/readingDraft';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { stripZwsp } from '@/utils/myanmar';

const normalizer = (s: string) => stripZwsp(s).trim();
const DAY = 24 * 60 * 60 * 1000;
const NOW = 10 * DAY;
const base: Pacing = { installedAt: 0, finished: 3, sinceLastAd: 3, lastShownAt: null };

describe('interstitialDue', () => {
  it('is due once the grace period, reading count and spacing are all met', () => {
    expect(interstitialDue(base, NOW)).toBe(true);
  });
  it('waits out the first days after install', () => {
    expect(interstitialDue({ ...base, installedAt: NOW - DAY }, NOW)).toBe(false);
    expect(interstitialDue({ ...base, installedAt: NOW - INTERSTITIAL_RULES.graceDays * DAY }, NOW)).toBe(true);
  });
  it('needs at least three finished readings overall', () => {
    expect(interstitialDue({ ...base, finished: 2, sinceLastAd: 2 }, NOW)).toBe(false);
  });
  it('shows at most once per three readings', () => {
    expect(interstitialDue({ ...base, finished: 9, sinceLastAd: 2, lastShownAt: 0 }, NOW)).toBe(false);
  });
  it('keeps a cooldown between ads', () => {
    expect(interstitialDue({ ...base, lastShownAt: NOW - 60_000 }, NOW)).toBe(false);
    expect(interstitialDue({ ...base, lastShownAt: NOW - INTERSTITIAL_RULES.cooldownMs }, NOW)).toBe(true);
  });
});

let ads: FakeAds;

beforeEach(() => {
  useReadingDraft.setState({ draft: null });
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useDaily.setState({ dateKey: null, draw: null, loading: false, bonus: null });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
  usePremium.setState({ isPremium: false, packages: [], packagesError: false, shareMonth: monthKey(), sharesUsed: 0 });
  useAds.setState({ ready: true, privacyOptions: false });
  // Old install, two readings already finished: the next one makes an interstitial due.
  useAdPacing.setState({ installedAt: Date.now() - 30 * DAY, finished: 2, sinceLastAd: 2, lastShownAt: null });
  setPurchasesService(new FakePurchases());
  ads = new FakeAds();
  setAdsService(ads);
});

afterEach(() => {
  setAdsService(undefined);
  setPurchasesService(undefined);
  jest.restoreAllMocks();
});

describe('post-reading interstitial', () => {
  it('counts a finished free reading and preloads an ad when one is due', () => {
    useAds.getState().noteReadingFinished('one-card');
    expect(useAdPacing.getState()).toMatchObject({ finished: 3, sinceLastAd: 3 });
    expect(ads.prepared).toBe(1);
  });

  it('does not count Premium spreads, which are already behind a rewarded ad', () => {
    useAds.getState().noteReadingFinished('celtic-cross');
    expect(useAdPacing.getState().finished).toBe(2);
    expect(ads.prepared).toBe(0);
  });

  it('shows nothing for Premium or a build without interstitials', async () => {
    useAds.getState().noteReadingFinished('one-card');
    usePremium.setState({ isPremium: true });
    expect(await useAds.getState().showInterstitialIfDue()).toBe(false);
    usePremium.setState({ isPremium: false });
    ads.interstitial = false;
    expect(await useAds.getState().showInterstitialIfDue()).toBe(false);
    expect(ads.interstitialsShown).toBe(0);
  });

  it('never waits for a load: no ready ad means no ad, and the count stays due', async () => {
    useAds.getState().noteReadingFinished('one-card');
    ads.interstitialReady = false;
    expect(await useAds.getState().showInterstitialIfDue()).toBe(false);
    expect(useAdPacing.getState().sinceLastAd).toBe(3);
  });

  it('resets the count and starts the cooldown after an ad is shown', async () => {
    useAds.getState().noteReadingFinished('one-card');
    expect(await useAds.getState().showInterstitialIfDue()).toBe(true);
    expect(useAdPacing.getState()).toMatchObject({ sinceLastAd: 0, finished: 3 });
    expect(useAdPacing.getState().lastShownAt).not.toBeNull();
    expect(await useAds.getState().showInterstitialIfDue()).toBe(false);
  });

  it('shows on the way out of a finished reading, then goes Home', async () => {
    renderRouter('./app', { initialUrl: '/home' });
    fireEvent.press(await screen.findByTestId('home-spread-one-card'));
    fireEvent.press(await screen.findByTestId('reading-start'));
    fireEvent.press(await screen.findByTestId('reading-shuffle'));
    await screen.findByTestId('fan-deck');
    fireEvent.press(screen.getByTestId('reading-pick-for-me'));
    await screen.findByText(en.reading.revealTitle, { normalizer }, { timeout: 2000 });
    fireEvent.press(screen.getByTestId('spread-card-0'));
    await screen.findByTestId('reading-summary');
    await waitFor(() => expect(useAdPacing.getState().finished).toBe(3));
    expect(ads.prepared).toBe(1);
    expect(ads.interstitialsShown).toBe(0); // never during the reading

    await act(async () => {
      fireEvent.press(screen.getByTestId('reading-home'));
    });
    await waitFor(() => expect(ads.interstitialsShown).toBe(1));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
  });
});
