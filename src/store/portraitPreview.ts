import { create } from 'zustand';

import { localDateKey } from '@/utils/dates';

type State = {
  /** Day the free preview was last used (memory only: it resets when the app restarts). */
  day: string | null;
  canPreview: (now?: Date) => boolean;
  markPreviewed: (now?: Date) => void;
};

/** Free users get one moving-portrait preview a day. */
export const usePortraitPreview = create<State>()((set, get) => ({
  day: null,
  canPreview: (now = new Date()) => get().day !== localDateKey(now),
  markPreviewed: (now = new Date()) => set({ day: localDateKey(now) }),
}));
