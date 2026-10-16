import type { Language } from '@/i18n/languages';

import { formatNumber } from './numbers';

export const MONTHS: Record<Language, readonly string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  my: [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
  ],
};

/** Weekday names indexed like Date#getDay(): 0 = Sunday … 6 = Saturday. */
export const WEEKDAYS: Record<Language, readonly string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  my: ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'],
};

export type DateStyle = 'long' | 'short' | 'weekday-long';

export type DateFormatOptions = {
  style?: DateStyle;
  burmeseNumerals?: boolean;
  withTime?: boolean;
};

/**
 * Formats a date in English or Burmese without relying on Intl (Hermes may
 * not have Burmese locale data).
 *
 *  en long:          15 October 2026
 *  en weekday-long:  Thursday, 15 October 2026
 *  en short:         15 Oct 2026
 *  my long:          ၂၀၂၆ ခုနှစ်၊ အောက်တိုဘာ ၁၅ ရက်   (digits per setting)
 *  my weekday-long:  ကြာသပတေးနေ့၊ ၂၀၂၆ ခုနှစ်၊ အောက်တိုဘာ ၁၅ ရက်
 *  my short:         အောက်တိုဘာ ၁၅၊ ၂၀၂၆
 */
export function formatDate(date: Date, language: Language, options: DateFormatOptions = {}): string {
  const { style = 'long', burmeseNumerals = false, withTime = false } = options;
  const n = (v: number, pad = 1) => formatNumber(v, { burmeseNumerals, grouping: false, minimumIntegerDigits: pad });
  const day = n(date.getDate());
  const year = n(date.getFullYear());
  const month = MONTHS[language][date.getMonth()]!;
  const weekday = WEEKDAYS[language][date.getDay()]!;
  let text: string;

  if (language === 'my') {
    if (style === 'short') text = `${month} ${day}၊ ${year}`;
    else {
      text = `${year} ခုနှစ်၊ ${month} ${day} ရက်`;
      if (style === 'weekday-long') text = `${weekday}နေ့၊ ${text}`;
    }
  } else {
    if (style === 'short') text = `${day} ${month.slice(0, 3)} ${year}`;
    else {
      text = `${day} ${month} ${year}`;
      if (style === 'weekday-long') text = `${weekday}, ${text}`;
    }
  }

  if (withTime) text += ` ${formatTime(date, language, { burmeseNumerals })}`;
  return text;
}

/** 24h-free, friendly time: "7:05 PM" / "ညနေ ၇:၀၅". */
export function formatTime(date: Date, language: Language, options: { burmeseNumerals?: boolean } = {}): string {
  const { burmeseNumerals = false } = options;
  const n = (v: number, pad = 1) => formatNumber(v, { burmeseNumerals, grouping: false, minimumIntegerDigits: pad });
  const h24 = date.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = n(date.getMinutes(), 2);
  if (language === 'my') return `${burmeseDayPeriod(h24)} ${n(h12)}:${mm}`;
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function burmeseDayPeriod(h24: number): string {
  if (h24 < 12) return 'နံနက်';
  if (h24 < 16) return 'နေ့လည်';
  if (h24 < 19) return 'ညနေ';
  return 'ည';
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/** Zero-pads to two digits, e.g. 7 -> "07". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Local calendar date key, e.g. "2026-10-15". Used for the daily card seed. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
