import { Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { adsConfig } from '@/config/ads';

import type { AdsService, RewardOutcome } from './service';

/** Seconds to wait for a rewarded ad to load before telling the viewer none is available. */
const LOAD_TIMEOUT_MS = 15000;

/** AdMob-backed ads, or null when this build has ads turned off. */
export function adMobService(): AdsService | null {
  const config = adsConfig();
  if (!config) return null;
  const rewardedUnit = __DEV__ ? TestIds.REWARDED : config.rewarded;
  const interstitialUnit = __DEV__ ? TestIds.INTERSTITIAL : config.interstitial;
  // One preloaded interstitial at a time; null when none is loading or ready.
  let pending: { ad: InterstitialAd; loaded: boolean } | null = null;

  return {
    async start() {
      try {
        await AdsConsent.gatherConsent();
      } catch {
        // Offline or the form failed: fall through; canRequestAds below decides.
      }
      if (Platform.OS === 'ios') {
        await requestTrackingPermissionsAsync().catch(() => undefined);
      }
      const info = await AdsConsent.getConsentInfo();
      if (!info.canRequestAds) return false;
      // A tarot app should not get violent or sexual ads: keep them to PG.
      await MobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        testDeviceIdentifiers: config.testDevices,
      });
      await MobileAds().initialize();
      return true;
    },
    hasRewarded: () => !!rewardedUnit,
    showRewarded() {
      if (!rewardedUnit) return Promise.resolve<RewardOutcome>('unavailable');
      return new Promise<RewardOutcome>((resolve) => {
        const ad = RewardedAd.createForAdRequest(rewardedUnit);
        let earned = false;
        let settled = false;
        const unsubscribe: (() => void)[] = [];
        const timer = setTimeout(() => finish('unavailable'), LOAD_TIMEOUT_MS);
        const finish = (outcome: RewardOutcome) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          unsubscribe.forEach((u) => u());
          resolve(outcome);
        };
        unsubscribe.push(
          ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            clearTimeout(timer);
            ad.show().catch(() => finish('unavailable'));
          }),
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'closed')),
          ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')),
        );
        ad.load();
      });
    },
    hasInterstitial: () => !!interstitialUnit,
    prepareInterstitial() {
      if (!interstitialUnit || pending) return;
      const entry = { ad: InterstitialAd.createForAdRequest(interstitialUnit), loaded: false };
      pending = entry;
      entry.ad.addAdEventListener(AdEventType.LOADED, () => {
        entry.loaded = true;
      });
      entry.ad.addAdEventListener(AdEventType.ERROR, () => {
        if (pending === entry) pending = null;
      });
      entry.ad.load();
    },
    showInterstitial() {
      const entry = pending;
      if (!entry?.loaded) return Promise.resolve(false);
      pending = null;
      return new Promise<boolean>((resolve) => {
        const unsubscribe = [
          entry.ad.addAdEventListener(AdEventType.CLOSED, () => done(true)),
          entry.ad.addAdEventListener(AdEventType.ERROR, () => done(false)),
        ];
        const done = (shown: boolean) => {
          unsubscribe.forEach((u) => u());
          resolve(shown);
        };
        entry.ad.show().catch(() => done(false));
      });
    },
    async privacyOptionsRequired() {
      const info = await AdsConsent.getConsentInfo();
      return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    },
    async showPrivacyOptions() {
      await AdsConsent.showPrivacyOptionsForm();
    },
  };
}
