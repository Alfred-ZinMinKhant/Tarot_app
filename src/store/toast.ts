import { create } from 'zustand';

export type ToastMessage = { id: number; text: string; actionLabel?: string; onAction?: () => void };

type ToastState = {
  current: ToastMessage | null;
  show: (text: string, action?: { label: string; onPress: () => void }) => void;
  hide: () => void;
};

let nextId = 1;

export const useToast = create<ToastState>()((set) => ({
  current: null,
  show: (text, action) =>
    set({ current: { id: nextId++, text, actionLabel: action?.label, onAction: action?.onPress } }),
  hide: () => set({ current: null }),
}));
