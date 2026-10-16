import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { FREE_SHARES_PER_MONTH, isPremiumSpread, monthKey } from '@/premium/features';
import type { PremiumPackage, PurchaseOutcome, PurchasesService } from '@/premium/service';
import { logError } from '@/utils/log';

type PremiumState = {
  /** Last known entitlement, cached so Premium stays unlocked offline and at startup. */
  isPremium: boolean;
  packages: PremiumPackage[];
  loadingPackages: boolean;
  packagesError: boolean;
  /** Image shares used this month on the free plan. */
  shareMonth: string;
  sharesUsed: number;
  init: () => Promise<void>;
  loadPackages: () => Promise<void>;
  purchase: (packageId: string) => Promise<PurchaseOutcome>;
  restore: () => Promise<boolean | null>;
  redeemCode: () => Promise<void>;
  recordShare: (now?: Date) => void;
};

/** undefined = not wired yet; null = this build has no in-app purchases (everything unlocked). */
let service: PurchasesService | null | undefined;

export function setPurchasesService(next: PurchasesService | null | undefined): void {
  service = next;
}

export function ensurePurchasesService(create: () => PurchasesService | null): void {
  if (service === undefined) {
    try {
      service = create();
    } catch (e) {
      logError('premium.create', e);
      service = null;
    }
  }
}

/** True when this build sells Premium (a RevenueCat key is configured). */
export const purchasesAvailable = (): boolean => !!service;

export const usePremium = create<PremiumState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      packages: [],
      loadingPackages: false,
      packagesError: false,
      shareMonth: monthKey(),
      sharesUsed: 0,
      init: async () => {
        if (!service) return;
        service.onChange((isPremium) => set({ isPremium }));
        try {
          set({ isPremium: await service.isPremium() });
        } catch (e) {
          // Offline and no store cache yet: keep the last known value.
          logError('premium.init', e);
        }
      },
      loadPackages: async () => {
        if (!service) return;
        set({ loadingPackages: true, packagesError: false });
        try {
          set({ packages: await service.packages(), loadingPackages: false });
        } catch (e) {
          logError('premium.loadPackages', e);
          set({ loadingPackages: false, packagesError: true });
        }
      },
      purchase: async (packageId) => {
        if (!service) return 'failed';
        try {
          const { outcome, premium } = await service.purchase(packageId);
          if (premium) set({ isPremium: true });
          return outcome;
        } catch (e) {
          logError('premium.purchase', e);
          return 'failed';
        }
      },
      restore: async () => {
        if (!service) return null;
        try {
          const isPremium = await service.restore();
          set({ isPremium });
          return isPremium;
        } catch (e) {
          logError('premium.restore', e);
          return null;
        }
      },
      redeemCode: async () => {
        await service?.redeemCode().catch((e) => logError('premium.redeemCode', e));
      },
      recordShare: (now = new Date()) => {
        const month = monthKey(now);
        const used = get().shareMonth === month ? get().sharesUsed : 0;
        set({ shareMonth: month, sharesUsed: used + 1 });
      },
    }),
    {
      name: 'nat-tarot.premium',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ isPremium: s.isPremium, shareMonth: s.shareMonth, sharesUsed: s.sharesUsed }),
    },
  ),
);

/** Premium features are open when the user has Premium, or when this build doesn't sell it. */
export function useUnlocked(): boolean {
  const isPremium = usePremium((s) => s.isPremium);
  return isPremium || !purchasesAvailable();
}

export function useSpreadLocked(spreadId: string): boolean {
  const unlocked = useUnlocked();
  return isPremiumSpread(spreadId) && !unlocked;
}

/** Free image shares left this month, or null when unlimited. */
export function useSharesLeft(now = new Date()): number | null {
  const unlocked = useUnlocked();
  const shareMonth = usePremium((s) => s.shareMonth);
  const sharesUsed = usePremium((s) => s.sharesUsed);
  if (unlocked) return null;
  const used = shareMonth === monthKey(now) ? sharesUsed : 0;
  return Math.max(0, FREE_SHARES_PER_MONTH - used);
}
