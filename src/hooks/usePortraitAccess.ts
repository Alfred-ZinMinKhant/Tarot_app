import { purchasesAvailable, usePremium } from '@/store/premium';

/** Premium (or a build with no purchases at all) plays moving portraits fully; everyone else previews. */
export function usePortraitAccess(): 'full' | 'preview' {
  const isPremium = usePremium((s) => s.isPremium);
  return isPremium || !purchasesAvailable() ? 'full' : 'preview';
}
