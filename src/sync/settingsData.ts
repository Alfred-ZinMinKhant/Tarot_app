import { sameBirth, sanitizeBirth } from '@/astro/birth';
import { isSignId } from '@/data/content';
import { isLanguage } from '@/i18n/languages';
import type { SettingsState } from '@/store/settings';

/**
 * The settings that follow the account across phones. Left out on purpose:
 * - `name` and `deviceSeed`: the app promises they never leave the device;
 * - `reminderEnabled`: turning it on needs this phone's notification permission;
 * - `hasOnboarded`: each install still shows its own first-run welcome.
 */
export const SYNCED_SETTING_KEYS = [
  'language',
  'themeMode',
  'fontSize',
  'myanmarFont',
  'burmeseNumerals',
  'reversedCards',
  'haptics',
  'reminderHour',
  'reminderMinute',
  'birthSign',
  'birth',
  'soundEnabled',
  'lessonsRead',
] as const satisfies readonly (keyof SettingsState)[];

type Synced = Pick<SettingsState, (typeof SYNCED_SETTING_KEYS)[number]>;

export function pickSynced(s: SettingsState): Record<string, unknown> {
  return Object.fromEntries(SYNCED_SETTING_KEYS.map((k) => [k, s[k]]));
}

export const syncedChanged = (a: SettingsState, b: SettingsState): boolean =>
  SYNCED_SETTING_KEYS.some((k) => (k === 'birth' ? !sameBirth(a.birth, b.birth) : k === 'lessonsRead' ? a[k] !== b[k] : !Object.is(a[k], b[k])));

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const oneOf = <T extends string>(v: unknown, options: readonly T[]): v is T =>
  options.includes(v as T);

/** Keeps only well-formed values from a cloud copy, so a bad row can never break the app. */
export function sanitizeSettings(data: Record<string, unknown>): Partial<Synced> {
  const out: Record<string, unknown> = {};
  if (data.language === null || isLanguage(data.language)) out.language = data.language;
  if (oneOf(data.themeMode, ['system', 'light', 'dark'] as const)) out.themeMode = data.themeMode;
  if (oneOf(data.fontSize, ['S', 'M', 'L'] as const)) out.fontSize = data.fontSize;
  if (oneOf(data.myanmarFont, ['noto', 'padauk'] as const)) out.myanmarFont = data.myanmarFont;
  for (const k of ['burmeseNumerals', 'reversedCards', 'haptics', 'soundEnabled'] as const) {
    if (typeof data[k] === 'boolean') out[k] = data[k];
  }
  if (isInt(data.reminderHour, 0, 23)) out.reminderHour = data.reminderHour;
  if (isInt(data.reminderMinute, 0, 59)) out.reminderMinute = data.reminderMinute;
  if (data.birthSign === null || isSignId(data.birthSign)) out.birthSign = data.birthSign;
  if (data.birth === null) out.birth = null;
  else if (data.birth !== undefined) {
    const birth = sanitizeBirth(data.birth);
    if (birth) out.birth = birth;
  }
  if (Array.isArray(data.lessonsRead) && data.lessonsRead.every((x) => typeof x === 'string')) {
    out.lessonsRead = [...new Set(data.lessonsRead as string[])].slice(0, 200);
  }
  return out as Partial<Synced>;
}
