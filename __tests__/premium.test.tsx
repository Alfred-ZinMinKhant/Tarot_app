import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import en from '../locales/en.json';
import { FakePurchases } from '../test/mocks/fakePurchases';

import * as purchasesConfig from '@/config/purchases';
import { resetJournalRepo } from '@/db';
import { FREE_SHARES_PER_MONTH, monthKey } from '@/premium/features';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { setPurchasesService, usePremium } from '@/store/premium';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { stripZwsp } from '@/utils/myanmar';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/reading.png') }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

const normalizer = (s: string) => stripZwsp(s).trim();
let store: FakePurchases;

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useDaily.setState({ dateKey: null, draw: null, loading: false });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
  usePremium.setState({ isPremium: false, packages: [], packagesError: false, shareMonth: monthKey(), sharesUsed: 0 });
  store = new FakePurchases();
  setPurchasesService(store);
});

afterEach(() => {
  setPurchasesService(undefined);
  jest.restoreAllMocks();
});

describe('premium', () => {
  it('without in-app purchases everything is unlocked and no paywall appears', async () => {
    setPurchasesService(null);
    renderRouter('./app', { initialUrl: '/home' });
    expect(await screen.findByTestId('home-spread-celtic-cross')).toBeTruthy();
    expect(screen.queryByTestId('home-spread-lock-celtic-cross')).toBeNull();
    fireEvent.press(screen.getByTestId('home-spread-celtic-cross'));
    expect(await screen.findByTestId('reading-start')).toBeTruthy();
  });

  it('locks Love and Celtic Cross, keeps the rest free', async () => {
    renderRouter('./app', { initialUrl: '/home' });
    expect(await screen.findByTestId('home-spread-lock-love')).toBeTruthy();
    expect(screen.getByTestId('home-spread-lock-celtic-cross')).toBeTruthy();
    expect(screen.queryByTestId('home-spread-lock-one-card')).toBeNull();
    expect(screen.queryByTestId('home-spread-lock-three-past-present-future')).toBeNull();
    expect(screen.queryByTestId('home-spread-lock-three-situation-challenge-advice')).toBeNull();
  });

  it('buying from the paywall unlocks the spread', async () => {
    const r = renderRouter('./app', { initialUrl: '/home' });
    fireEvent.press(await screen.findByTestId('home-spread-love'));
    expect(await screen.findByTestId('screen-paywall')).toBeTruthy();
    expect(screen.getByTestId('paywall-reason')).toHaveTextContent(/Love Spread is a Premium spread/);
    // Yearly is listed first and preselected; prices come from the store.
    expect(await screen.findByTestId('paywall-buy')).toHaveTextContent('Continue: 29,000 Ks');
    fireEvent.press(screen.getByTestId('paywall-package-$rc_monthly'));
    expect(screen.getByTestId('paywall-buy')).toHaveTextContent('Continue: 4,900 Ks');
    fireEvent.press(screen.getByTestId('paywall-buy'));
    expect(await screen.findByText(en.premium.thanks.replace('$t(appName)', 'Nat Tarot'))).toBeTruthy();
    await waitFor(() => expect(r.getPathname()).toBe('/home'));
    expect(usePremium.getState().isPremium).toBe(true);
    expect(screen.queryByTestId('home-spread-lock-love')).toBeNull();
    fireEvent.press(screen.getByTestId('home-spread-love'));
    expect(await screen.findByTestId('reading-start')).toBeTruthy();
  });

  it('a cancelled purchase shows no error and keeps the paywall open', async () => {
    store.nextOutcome = 'cancelled';
    renderRouter('./app', { initialUrl: '/paywall' });
    fireEvent.press(await screen.findByTestId('paywall-buy'));
    await waitFor(() => expect(useToast.getState().current).toBeNull());
    expect(screen.getByTestId('screen-paywall')).toBeTruthy();
    expect(usePremium.getState().isPremium).toBe(false);
  });

  it('restore: finds an earlier purchase, or says there is none', async () => {
    renderRouter('./app', { initialUrl: '/paywall' });
    fireEvent.press(await screen.findByTestId('paywall-restore'));
    expect(await screen.findByText(en.premium.nothingToRestore)).toBeTruthy();
    store.owned = true;
    fireEvent.press(screen.getByTestId('paywall-restore'));
    expect(await screen.findByText(en.premium.restored)).toBeTruthy();
    expect(usePremium.getState().isPremium).toBe(true);
  });

  it('offers a retry when prices cannot load', async () => {
    store.offline = true;
    renderRouter('./app', { initialUrl: '/paywall' });
    expect(await screen.findByTestId('paywall-offline')).toBeTruthy();
    expect(screen.queryByTestId('paywall-buy')).toBeNull();
    store.offline = false;
    fireEvent.press(screen.getByTestId('paywall-retry'));
    expect(await screen.findByTestId('paywall-buy')).toBeTruthy();
  });

  it('protects premium spreads opened directly', async () => {
    renderRouter('./app', { initialUrl: '/reading/celtic-cross' });
    expect(await screen.findByTestId('screen-reading-locked')).toBeTruthy();
    fireEvent.press(screen.getByTestId('reading-unlock'));
    expect(await screen.findByTestId('screen-paywall')).toBeTruthy();
  });

  it('shows the local payment option only when configured', async () => {
    renderRouter('./app', { initialUrl: '/paywall' });
    await screen.findByTestId('paywall-buy');
    expect(screen.queryByTestId('paywall-local')).toBeNull();
  });

  it('local payment opens the partner and code redemption', async () => {
    jest.spyOn(purchasesConfig, 'localPaymentConfig').mockReturnValue({ url: 'https://pay.example', name: 'KBZPay' });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderRouter('./app', { initialUrl: '/paywall' });
    expect(await screen.findByTestId('paywall-local')).toBeTruthy();
    expect(screen.getByText('Pay with KBZPay', { normalizer })).toBeTruthy();
    fireEvent.press(screen.getByTestId('paywall-local-pay'));
    expect(open).toHaveBeenCalledWith('https://pay.example');
    fireEvent.press(screen.getByTestId('paywall-redeem'));
    await waitFor(() => expect(store.redeemed).toBe(1));
  });

  it('allows a few free image shares a month, then asks for Premium', async () => {
    const r = renderRouter('./app', { initialUrl: '/daily' });
    fireEvent.press(await screen.findByTestId('daily-reveal-button'));
    for (let i = 0; i < FREE_SHARES_PER_MONTH; i++) {
      fireEvent.press(await screen.findByTestId('daily-share'));
      expect(await screen.findByTestId('share-allowance')).toHaveTextContent(
        `Free image shares left this month: ${FREE_SHARES_PER_MONTH - i}`,
      );
      fireEvent.press(screen.getByTestId('share-confirm'));
      await waitFor(() => expect(usePremium.getState().sharesUsed).toBe(i + 1));
    }
    fireEvent.press(await screen.findByTestId('daily-share'));
    expect(await screen.findByText(en.premium.sharesUsedUp)).toBeTruthy();
    fireEvent.press(screen.getByTestId('share-confirm'));
    expect(await screen.findByTestId('screen-paywall')).toBeTruthy();
    expect(r.getPathname()).toBe('/paywall');
  });

  it('the free share allowance resets each month', () => {
    act(() => {
      usePremium.getState().recordShare(new Date(2026, 9, 30));
      usePremium.getState().recordShare(new Date(2026, 9, 31));
    });
    expect(usePremium.getState()).toMatchObject({ shareMonth: '2026-10', sharesUsed: 2 });
    act(() => usePremium.getState().recordShare(new Date(2026, 10, 1)));
    expect(usePremium.getState()).toMatchObject({ shareMonth: '2026-11', sharesUsed: 1 });
  });

  it('Settings shows the plan and follows entitlement changes', async () => {
    renderRouter('./app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('premium-status')).toHaveTextContent(en.premium.statusFree);
    await act(async () => {
      await usePremium.getState().init();
      store.listeners.forEach((l) => l(true));
    });
    expect(screen.getByTestId('premium-status')).toHaveTextContent(en.premium.statusPremium);
    expect(screen.getByTestId('premium-manage')).toBeTruthy();
  });
});
