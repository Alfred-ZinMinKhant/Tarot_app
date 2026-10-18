import { isPremiumSpread } from '@/premium/features';
import { rewardedConfigured } from '@/store/ads';
import { purchasesAvailable, usePremium } from '@/store/premium';

/**
 * Whether Premium spreads (Love, Celtic Cross) are open. They are for Premium subscribers, and for
 * a build that offers neither Premium nor a rewarded ad. Otherwise each reading is unlocked by
 * watching a rewarded ad (the paywall offers it).
 */
export function useSpreadsUnlocked(): boolean {
  const isPremium = usePremium((s) => s.isPremium);
  return isPremium || (!purchasesAvailable() && !rewardedConfigured());
}

export function useSpreadLocked(spreadId: string): boolean {
  const unlocked = useSpreadsUnlocked();
  return isPremiumSpread(spreadId) && !unlocked;
}
