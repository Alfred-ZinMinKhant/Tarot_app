import type { AdsService, RewardOutcome } from '@/ads/service';

/** Scriptable stand-in for AdMob. */
export class FakeAds implements AdsService {
  canRequest = true;
  rewarded = true;
  nextReward: RewardOutcome = 'earned';
  interstitial = true;
  /** Whether a preloaded interstitial is ready when asked to show. */
  interstitialReady = true;
  prepared = 0;
  interstitialsShown = 0;
  privacyRequired = false;
  shown = 0;
  privacyOpened = 0;
  async start() {
    return this.canRequest;
  }
  hasRewarded() {
    return this.rewarded;
  }
  async showRewarded() {
    this.shown++;
    return this.nextReward;
  }
  hasInterstitial() {
    return this.interstitial;
  }
  prepareInterstitial() {
    this.prepared++;
  }
  async showInterstitial() {
    if (!this.interstitial || !this.interstitialReady) return false;
    this.interstitialsShown++;
    return true;
  }
  async privacyOptionsRequired() {
    return this.privacyRequired;
  }
  async showPrivacyOptions() {
    this.privacyOpened++;
  }
}
