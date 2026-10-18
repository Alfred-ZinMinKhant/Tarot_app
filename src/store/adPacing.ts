import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Pacing } from '@/ads/pacing';

type PacingState = Pacing & {
  recordFinished: () => void;
  recordShown: (now?: number) => void;
  /** Delete my data: start the grace period over. */
  reset: () => void;
};

const fresh = (): Pacing => ({ installedAt: Date.now(), finished: 0, sinceLastAd: 0, lastShownAt: null });

/** Device-only counters behind the interstitial frequency cap. */
export const useAdPacing = create<PacingState>()(
  persist(
    (set) => ({
      ...fresh(),
      recordFinished: () => set((s) => ({ finished: s.finished + 1, sinceLastAd: s.sinceLastAd + 1 })),
      recordShown: (now = Date.now()) => set({ sinceLastAd: 0, lastShownAt: now }),
      reset: () => set(fresh()),
    }),
    {
      name: 'nat-tarot.ad-pacing',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        installedAt: s.installedAt,
        finished: s.finished,
        sinceLastAd: s.sinceLastAd,
        lastShownAt: s.lastShownAt,
      }),
    },
  ),
);
