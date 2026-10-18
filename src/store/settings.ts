import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidV4 } from '@/utils/id';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BirthData } from '@/astro/birth';
import type { SignId } from '@/data/content';
import type { Language } from '@/i18n/languages';
import type { FontSizeSetting, MyanmarFont } from '@/theme/typography';

export type ThemeMode = 'system' | 'light' | 'dark';

export type SettingsState = {
  /** null = follow the device locale. */
  language: Language | null;
  themeMode: ThemeMode;
  fontSize: FontSizeSetting;
  myanmarFont: MyanmarFont;
  burmeseNumerals: boolean;
  /** Allow reversed cards in readings and the daily card. */
  reversedCards: boolean;
  haptics: boolean;
  reminderEnabled: boolean;
  /** Local time of the daily reminder. */
  reminderHour: number;
  reminderMinute: number;
  hasOnboarded: boolean;
  /** Optional first name for the greeting (stays on the device). */
  name: string;
  /** Burmese weekday sign chosen in onboarding or on the sign screen. */
  birthSign: SignId | null;
  /** Birth date, optional time and place for the natal chart. */
  birth: BirthData | null;
  /** The Home "create your birth chart" card was dismissed. Device-only. */
  chartNudgeDismissed: boolean;
  /** Soft sound effects for shuffling and card flips. Off by default. */
  soundEnabled: boolean;
  /** Ids of finished Learn lessons. */
  lessonsRead: string[];
  /**
   * Private random seed created once on this device; makes the Card of the Day personal but stable
   * for the whole day. Never leaves the device.
   */
  deviceSeed: string | null;
  setLanguage: (language: Language | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSizeSetting) => void;
  setMyanmarFont: (font: MyanmarFont) => void;
  setBurmeseNumerals: (enabled: boolean) => void;
  setReversedCards: (enabled: boolean) => void;
  setHaptics: (enabled: boolean) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  /** Returns the device seed, creating it on first use. */
  setName: (name: string) => void;
  setBirthSign: (sign: SignId | null) => void;
  setBirth: (birth: BirthData | null) => void;
  dismissChartNudge: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  markLessonRead: (id: string) => void;
  ensureDeviceSeed: () => string;
  completeOnboarding: () => void;
  reset: () => void;
  /** Delete my data: back to first-run defaults, including a fresh device seed. */
  wipe: () => void;
};

export const DEFAULT_SETTINGS = {
  language: null,
  themeMode: 'system',
  fontSize: 'M',
  myanmarFont: 'noto',
  burmeseNumerals: false,
  reversedCards: true,
  haptics: true,
  reminderEnabled: false,
  reminderHour: 8,
  reminderMinute: 0,
  hasOnboarded: false,
  name: '',
  birthSign: null as SignId | null,
  birth: null as BirthData | null,
  chartNudgeDismissed: false,
  soundEnabled: false,
  lessonsRead: [] as string[],
  deviceSeed: null as string | null,
} satisfies Partial<SettingsState>;

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setFontSize: (fontSize) => set({ fontSize }),
      setMyanmarFont: (myanmarFont) => set({ myanmarFont }),
      setBurmeseNumerals: (burmeseNumerals) => set({ burmeseNumerals }),
      setReversedCards: (reversedCards) => set({ reversedCards }),
      setHaptics: (haptics) => set({ haptics }),
      setReminderEnabled: (reminderEnabled) => set({ reminderEnabled }),
      setReminderTime: (hour, minute) => {
        const total = (((hour * 60 + minute) % 1440) + 1440) % 1440;
        set({ reminderHour: Math.floor(total / 60), reminderMinute: total % 60 });
      },
      setName: (name) => set({ name: name.slice(0, 40) }),
      setBirthSign: (birthSign) => set({ birthSign }),
      setBirth: (birth) => set({ birth }),
      dismissChartNudge: () => set({ chartNudgeDismissed: true }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      markLessonRead: (id) => {
        const read = get().lessonsRead;
        if (!read.includes(id)) set({ lessonsRead: [...read, id] });
      },
      ensureDeviceSeed: () => {
        const existing = get().deviceSeed;
        if (existing) return existing;
        const deviceSeed = uuidV4();
        set({ deviceSeed });
        return deviceSeed;
      },
      completeOnboarding: () => set({ hasOnboarded: true }),
      // Keeps the device seed so the Card of the Day doesn't change after a settings reset.
      reset: () => set({ ...DEFAULT_SETTINGS, deviceSeed: get().deviceSeed }),
      wipe: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'nat-tarot.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        language: s.language,
        themeMode: s.themeMode,
        fontSize: s.fontSize,
        myanmarFont: s.myanmarFont,
        burmeseNumerals: s.burmeseNumerals,
        reversedCards: s.reversedCards,
        haptics: s.haptics,
        reminderEnabled: s.reminderEnabled,
        reminderHour: s.reminderHour,
        reminderMinute: s.reminderMinute,
        hasOnboarded: s.hasOnboarded,
        name: s.name,
        birthSign: s.birthSign,
        birth: s.birth,
        chartNudgeDismissed: s.chartNudgeDismissed,
        soundEnabled: s.soundEnabled,
        lessonsRead: s.lessonsRead,
        deviceSeed: s.deviceSeed,
      }),
    },
  ),
);
