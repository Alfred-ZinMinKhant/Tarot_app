import type { AdsService, RewardOutcome } from '@/ads/service';

/** Scriptable stand-in for AdMob. */
export class FakeAds implements AdsService {
  canRequest = true;
  rewarded = true;
  nextReward: RewardOutcome = 'earned';
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
  async privacyOptionsRequired() {
    return this.privacyRequired;
  }
  async showPrivacyOptions() {
    this.privacyOpened++;
  }
}
