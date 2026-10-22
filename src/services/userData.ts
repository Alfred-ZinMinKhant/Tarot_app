/**
 * Settings → Export my data / Delete my data.
 * The export is a plain JSON file the user controls; nothing is uploaded.
 */
import type { BirthData } from '@/astro/birth';
import Constants from 'expo-constants';

import { getJournalRepo, type ReadingRecord } from '@/db';
import { cancelReminders } from '@/services/notifications';
import { useAdPacing } from '@/store/adPacing';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { logError } from '@/utils/log';
import { useReadingDraft } from '@/store/readingDraft';
import { useSettings } from '@/store/settings';
import { useSync } from '@/store/sync';
import { localDateKey } from '@/utils/dates';

export const EXPORT_FORMAT = 'nat-tarot-export';
export const EXPORT_VERSION = 1;

export type UserDataExport = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  appVersion: string;
  exportedAt: string;
  profile: { name: string; birthSign: string | null; birth: BirthData | null };
  settings: Record<string, unknown>;
  lessonsRead: string[];
  readings: ReadingRecord[];
};

/** Everything the app stores about the user, except the private device seed. */
export async function buildExport(now = new Date()): Promise<UserDataExport> {
  const s = useSettings.getState();
  const repo = await getJournalRepo();
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    appVersion: Constants.expoConfig?.version ?? '',
    exportedAt: now.toISOString(),
    profile: { name: s.name, birthSign: s.birthSign, birth: s.birth },
    settings: {
      language: s.language,
      fontSize: s.fontSize,
      myanmarFont: s.myanmarFont,
      burmeseNumerals: s.burmeseNumerals,
      reversedCards: s.reversedCards,
      haptics: s.haptics,
      soundEnabled: s.soundEnabled,
      reminderEnabled: s.reminderEnabled,
      reminderHour: s.reminderHour,
      reminderMinute: s.reminderMinute,
    },
    lessonsRead: s.lessonsRead,
    readings: await repo.listReadings(),
  };
}

export function exportFileName(now = new Date()): string {
  return `nat-tarot-${localDateKey(now)}.json`;
}

/** Removes every reading, note, daily card, reminder and personal setting from this device. */
export async function deleteAllUserData(): Promise<void> {
  // A failed cancel must not stop the wipe: stale reminders are harmless, retained data is not.
  await cancelReminders().catch((e) => logError('userData.cancelReminders', e));
  // Sign out of cloud backup first so the local wipe isn't mistaken for deletions to upload.
  // The cloud copy stays until the user deletes it (Settings → Cloud backup).
  await useSync.getState().signOut();
  await useJournal.getState().removeAll();
  useDaily.setState({ draw: null, dateKey: null });
  useReadingDraft.getState().clear();
  useSettings.getState().wipe();
  useAdPacing.getState().reset();
}
