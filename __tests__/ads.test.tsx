import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import en from '../locales/en.json';
import { FakeAds } from '../test/mocks/fakeAds';
import { FakePurchases } from '../test/mocks/fakePurchases';

import { resetJournalRepo } from '@/db';
import { monthKey } from '@/premium/features';
import { useDaily } from '@/store/daily';
import { setAdsService, useAds } from '@/store/ads';
import { useJournal } from '@/store/journal';
import { setPurchasesService, usePremium } from '@/store/premium';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';

let ads: FakeAds;

async function startAds() {
  await act(async () => {
    await useAds.getState().init();
  });
}

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useDaily.setState({ dateKey: null, draw: null, loading: false });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
  usePremium.setState({ isPremium: false, packages: [], packagesError: false, shareMonth: monthKey(), sharesUsed: 0 });
  useAds.setState({ ready: false, privacyOptions: false });
  setPurchasesService(new FakePurchases());
  ads = new FakeAds();
  setAdsService(ads);
});

afterEach(() => {
  setAdsService(undefined);
  setPurchasesService(undefined);
  jest.restoreAllMocks();
});

describe('ads', () => {
  it('shows no banner in a build without ads', async () => {
    setAdsService(null);
    renderRouter('./app', { initialUrl: '/home' });
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('shows no banner until consent allows ads', async () => {
    ads.canRequest = false;
    renderRouter('./app', { initialUrl: '/home' });
    await startAds();
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('shows a banner on the home screen once ads are ready, and never on a reading', async () => {
    renderRouter('./app', { initialUrl: '/home' });
    await startAds();
    expect(await screen.findByTestId('ad-banner')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-spread-one-card'));
    expect(await screen.findByTestId('reading-start')).toBeTruthy();
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('hides every ad for Premium', async () => {
    const store = new FakePurchases();
    store.premium = true;
    setPurchasesService(store);
    usePremium.setState({ isPremium: true });
    renderRouter('./app', { initialUrl: '/home' });
    await startAds();
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('offers the privacy options only where required', async () => {
    ads.privacyRequired = true;
    renderRouter('./app', { initialUrl: '/settings' });
    await startAds();
    fireEvent.press(await screen.findByTestId('ad-privacy-open'));
    expect(ads.privacyOpened).toBe(1);
  });

  it('hides the privacy options elsewhere', async () => {
    renderRouter('./app', { initialUrl: '/settings' });
    await startAds();
    expect(await screen.findByTestId('premium-card')).toBeTruthy();
    expect(screen.queryByTestId('ad-privacy-open')).toBeNull();
  });
});

describe('rewarded ad unlock', () => {
  const openPaywall = async () => {
    renderRouter('./app', { initialUrl: '/home' });
    await startAds();
    fireEvent.press(await screen.findByTestId('home-spread-celtic-cross'));
  };

  it('opens one locked reading after the ad is watched', async () => {
    await openPaywall();
    fireEvent.press(await screen.findByTestId('paywall-watch-ad'));
    expect(await screen.findByTestId('reading-start')).toBeTruthy();
    expect(ads.shown).toBe(1);
    expect(screen.queryByTestId('screen-reading-locked')).toBeNull();
  });

  it('keeps the spread locked when the ad is dismissed early', async () => {
    ads.nextReward = 'closed';
    await openPaywall();
    fireEvent.press(await screen.findByTestId('paywall-watch-ad'));
    expect(await screen.findByText(en.ads.notFinished)).toBeTruthy();
    expect(screen.getByTestId('screen-paywall')).toBeTruthy();
  });

  it('says so when no ad can be shown', async () => {
    ads.nextReward = 'unavailable';
    await openPaywall();
    fireEvent.press(await screen.findByTestId('paywall-watch-ad'));
    expect(await screen.findByText(en.ads.unavailable)).toBeTruthy();
  });

  it('is not offered without a rewarded ad unit or for share limits', async () => {
    ads.rewarded = false;
    await openPaywall();
    expect(await screen.findByTestId('screen-paywall')).toBeTruthy();
    expect(screen.queryByTestId('paywall-watch-ad')).toBeNull();
  });
});
