import { create } from 'zustand';

import type { MyanmarFont } from '@/theme/typography';

type FontStatus = {
  /** Myanmar font families that loaded successfully. */
  available: MyanmarFont[];
  setAvailable: (fonts: MyanmarFont[]) => void;
};

export const useFontStatus = create<FontStatus>()((set) => ({
  available: [],
  setAvailable: (available) => set({ available }),
}));
