import type { AdsService } from './service';

/** No ads in the web preview. */
export function adMobService(): AdsService | null {
  return null;
}
