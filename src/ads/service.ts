/** 'earned' = the viewer watched to the end; 'closed' = dismissed early; 'unavailable' = no ad. */
export type RewardOutcome = 'earned' | 'closed' | 'unavailable';

export interface AdsService {
  /**
   * Asks for consent where the law requires it (and tracking permission on iOS), then starts the
   * ad SDK. Resolves true when ads may be requested.
   */
  start(): Promise<boolean>;
  /** Whether a rewarded ad format is configured. */
  hasRewarded(): boolean;
  showRewarded(): Promise<RewardOutcome>;
  /** Whether an interstitial ad format is configured. */
  hasInterstitial(): boolean;
  /** Starts loading an interstitial in the background so it can show instantly later. */
  prepareInterstitial(): void;
  /** Shows the preloaded interstitial and resolves when it closes. False = none was ready; never waits for a load. */
  showInterstitial(): Promise<boolean>;
  /** True when the viewer is in a region that must be able to change their ad consent. */
  privacyOptionsRequired(): Promise<boolean>;
  showPrivacyOptions(): Promise<void>;
}
