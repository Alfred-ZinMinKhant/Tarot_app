/**
 * When the post-reading interstitial may show. Deliberately gentle: this is a contemplative app and
 * the ad is only ever offered after a reading is finished and saved.
 */
export const INTERSTITIAL_RULES = {
  /** No interstitials in the first days after install. */
  graceDays: 2,
  /** No interstitials until this many readings have been finished in total. */
  minReadings: 3,
  /** At most one per this many finished readings. */
  everyReadings: 3,
  /** And never closer together than this. */
  cooldownMs: 5 * 60 * 1000,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Pacing = {
  installedAt: number;
  /** Finished readings that count toward ads (free spreads only). */
  finished: number;
  /** Finished readings since the last interstitial was shown. */
  sinceLastAd: number;
  lastShownAt: number | null;
};

export function interstitialDue(p: Pacing, now: number): boolean {
  const r = INTERSTITIAL_RULES;
  if (now - p.installedAt < r.graceDays * DAY_MS) return false;
  if (p.finished < r.minReadings || p.sinceLastAd < r.everyReadings) return false;
  return p.lastShownAt === null || now - p.lastShownAt >= r.cooldownMs;
}
