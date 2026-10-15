/**
 * Non-card content: Burmese weekday signs, Learn lessons and the legal texts.
 * Schemas are checked by `npm run check:content` (scripts/lib/content.ts).
 */
import legalRaw from '@data/legal.json';
import lessonsRaw from '@data/lessons.json';
import signsRaw from '@data/weekday-signs.json';

import { hashString } from '@/engine/random';
import type { Language } from '@/i18n/languages';

// ---------------------------------------------------------------------------------------------
// Weekday signs (Burmese astrology — presented for entertainment only)

export const SIGN_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'rahu', 'thursday', 'friday', 'saturday'] as const;
export type SignId = (typeof SIGN_IDS)[number];

export type SignText = {
  name: string;
  animal: string;
  planet: string;
  direction: string;
  traits: string[];
  personality: string;
  moods: string[];
};

export type WeekdaySign = { id: SignId; weekday: number } & Record<Language, SignText>;

export const SIGNS: readonly WeekdaySign[] = signsRaw as WeekdaySign[];

export function getSign(id: string | null | undefined): WeekdaySign | undefined {
  return SIGNS.find((s) => s.id === id);
}

export function isSignId(value: unknown): value is SignId {
  return typeof value === 'string' && (SIGN_IDS as readonly string[]).includes(value);
}

/**
 * The sign for someone born on `weekday` (0 = Sunday). Wednesday is split in two: before noon is
 * Wednesday (tusked elephant), from noon on is Rahu (tuskless elephant).
 */
export function signForWeekday(weekday: number, afternoon = false): SignId {
  const ids: SignId[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const id = ids[((weekday % 7) + 7) % 7]!;
  return id === 'wednesday' && afternoon ? 'rahu' : id;
}

/** Gregorian birth date → sign. Returns null for dates that don't exist (31 February…). */
export function signForBirthDate(year: number, month: number, day: number, afternoon = false): SignId | null {
  if (![year, month, day].every(Number.isInteger) || year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return signForWeekday(date.getDay(), afternoon);
}

/** Compass position of each sign on the traditional eight-direction layout, in degrees from north. */
export const SIGN_BEARING: Record<SignId, number> = {
  friday: 0,
  sunday: 45,
  monday: 90,
  tuesday: 135,
  wednesday: 180,
  saturday: 225,
  thursday: 270,
  rahu: 315,
};

/** A light-hearted mood line for today: stable through the day, different from day to day. */
export function dailyMood(sign: WeekdaySign, dateKey: string, lang: Language): string {
  const moods = sign[lang].moods;
  return moods[hashString(`${sign.id}|${dateKey}`) % moods.length]!;
}

// ---------------------------------------------------------------------------------------------
// Lessons

export type LessonSection = { heading: string; body: string };
export type Lesson = { id: string } & Record<Language, { title: string; summary: string; sections: LessonSection[] }>;

export const LESSONS: readonly Lesson[] = lessonsRaw as Lesson[];

export function getLesson(id: string | undefined): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

// ---------------------------------------------------------------------------------------------
// Legal texts

export const LEGAL_DOCS = ['privacy', 'terms'] as const;
export type LegalDocId = (typeof LEGAL_DOCS)[number];

/** A section is only shown when every value it `needs` is configured (e.g. a contact email). */
export type LegalSection = { heading: string; body: string; needs?: LegalVar[] };
export type LegalVar = 'appName' | 'publisher' | 'contactEmail';
export type LegalDoc = Record<Language, { title: string; sections: LegalSection[] }>;

export const LEGAL = legalRaw as Record<LegalDocId, LegalDoc>;

export function isLegalDoc(value: unknown): value is LegalDocId {
  return typeof value === 'string' && (LEGAL_DOCS as readonly string[]).includes(value);
}

/** Fills `{appName}`-style variables and drops sections whose variables aren't configured. */
export function renderLegal(
  doc: LegalDocId,
  lang: Language,
  vars: Partial<Record<LegalVar, string>>,
): { title: string; sections: LegalSection[] } {
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k as LegalVar] || m);
  const src = LEGAL[doc][lang];
  return {
    title: fill(src.title),
    sections: src.sections
      .filter((s) => (s.needs ?? []).every((k) => !!vars[k]))
      .map((s) => ({ heading: fill(s.heading), body: fill(s.body) })),
  };
}
