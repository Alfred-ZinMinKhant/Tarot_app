import { create } from 'zustand';

import type { AdsService, RewardOutcome } from '@/ads/service';
import { interstitialDue } from '@/ads/pacing';
import { isPremiumSpread, SHARES_PER_AD } from '@/premium/features';
import { useAdPacing } from '@/store/adPacing';
import { usePremium } from '@/store/premium';
import { logError } from '@/utils/log';

type AdsState = {
  /** Consent is settled and the SDK is running, so ads may be requested. */
  ready: boolean;
  /** The viewer is in a region that must be able to reopen the consent form. */
  privacyOptions: boolean;
  init: () => Promise<void>;
  /** Plays a rewarded ad. 'earned' means the viewer watched it to the end. */
  watchRewarded: () => Promise<RewardOutcome>;
  /** Plays a rewarded ad; a finished one grants a single reading of `spreadId`. */
  watchForSpread: (spreadId: string) => Promise<RewardOutcome>;
  /** Plays a rewarded ad; a finished one adds SHARES_PER_AD image shares for this month. */
  watchForShares: () => Promise<RewardOutcome>;
  /** A reading was finished and saved: count it, and start loading the interstitial when one is due. */
  noteReadingFinished: (spreadId: string) => void;
  /** On leaving a finished reading: shows the interstitial if one is due and loaded. Never waits for a load. */
  showInterstitialIfDue: () => Promise<boolean>;
  openPrivacyOptions: () => Promise<void>;
};

const interstitialAllowed = (ready: boolean): boolean =>
  ready && !!service?.hasInterstitial() && !usePremium.getState().isPremium;

/** undefined = not wired yet; null = this build has no ads. */
let service: AdsService | null | undefined;

export function setAdsService(next: AdsService | null | undefined): void {
  service = next;
}

export function ensureAdsService(create: () => AdsService | null): void {
  if (service === undefined) {
    try {
      service = create();
    } catch {
      service = null;
    }
  }
}

/** True when this build shows ads at all. */
export const adsAvailable = (): boolean => !!service;

/** True when a rewarded ad unit is configured, so Premium spreads can be unlocked by watching one. */
export const rewardedConfigured = (): boolean => !!service?.hasRewarded();

/** Spreads the viewer earned a one-off reading of by watching a rewarded ad (memory only). */
const grants = new Set<string>();

/** Uses up a rewarded-ad pass for `spreadId`. True when there was one. */
export const consumeSpreadGrant = (spreadId: string): boolean => grants.delete(spreadId);

export const useAds = create<AdsState>()((set, get) => ({
  ready: false,
  privacyOptions: false,
  init: async () => {
    if (!service) return;
    try {
      const ready = await service.start();
      set({ ready, privacyOptions: ready && (await service.privacyOptionsRequired()) });
    } catch {
      set({ ready: false });
    }
  },
  watchRewarded: async () => {
    if (!service) return 'unavailable';
    try {
      return await service.showRewarded();
    } catch {
      return 'unavailable';
    }
  },
  watchForSpread: async (spreadId) => {
    const outcome = await get().watchRewarded();
    if (outcome === 'earned') grants.add(spreadId);
    return outcome;
  },
  watchForShares: async () => {
    const outcome = await get().watchRewarded();
    if (outcome === 'earned') usePremium.getState().grantShares(SHARES_PER_AD);
    return outcome;
  },
  noteReadingFinished: (spreadId) => {
    // Premium spreads are already behind a rewarded ad (or a subscription): no second ad on top.
    if (isPremiumSpread(spreadId) || !interstitialAllowed(get().ready)) return;
    const pacing = useAdPacing.getState();
    pacing.recordFinished();
    if (interstitialDue(useAdPacing.getState(), Date.now())) service?.prepareInterstitial();
  },
  showInterstitialIfDue: async () => {
    if (!interstitialAllowed(get().ready) || !interstitialDue(useAdPacing.getState(), Date.now())) return false;
    try {
      const shown = (await service?.showInterstitial()) ?? false;
      if (shown) useAdPacing.getState().recordShown();
      return shown;
    } catch {
      return false;
    }
  },
  openPrivacyOptions: async () => {
    await service?.showPrivacyOptions().catch((e) => logError('ads.privacyOptions', e));
  },
}));

/** Banners show once the SDK is running, unless the viewer has Premium. */
export function useShowAds(): boolean {
  const ready = useAds((s) => s.ready);
  const isPremium = usePremium((s) => s.isPremium);
  return ready && !isPremium;
}

/** The rewarded "watch an ad to unlock" option is offered. */
export function useRewardedAvailable(): boolean {
  const show = useShowAds();
  return show && !!service?.hasRewarded();
}
