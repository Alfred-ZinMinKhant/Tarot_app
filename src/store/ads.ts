import { create } from 'zustand';

import type { AdsService, RewardOutcome } from '@/ads/service';
import { usePremium } from '@/store/premium';

type AdsState = {
  /** Consent is settled and the SDK is running, so ads may be requested. */
  ready: boolean;
  /** The viewer is in a region that must be able to reopen the consent form. */
  privacyOptions: boolean;
  init: () => Promise<void>;
  /** Plays a rewarded ad; a finished one grants a single reading of `spreadId`. */
  watchForSpread: (spreadId: string) => Promise<RewardOutcome>;
  openPrivacyOptions: () => Promise<void>;
};

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

/** Spreads the viewer earned a one-off reading of by watching a rewarded ad (memory only). */
const grants = new Set<string>();

/** Uses up a rewarded-ad pass for `spreadId`. True when there was one. */
export const consumeSpreadGrant = (spreadId: string): boolean => grants.delete(spreadId);

export const useAds = create<AdsState>()((set) => ({
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
  watchForSpread: async (spreadId) => {
    if (!service) return 'unavailable';
    let outcome: RewardOutcome;
    try {
      outcome = await service.showRewarded();
    } catch {
      outcome = 'unavailable';
    }
    if (outcome === 'earned') grants.add(spreadId);
    return outcome;
  },
  openPrivacyOptions: async () => {
    await service?.showPrivacyOptions().catch(() => undefined);
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
