import type { BirthPlace } from './chart';

/** What the user entered. The place is a snapshot, so a saved chart never depends on the city list. */
export type BirthData = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm, or null when the user doesn't know it. */
  time: string | null;
  place: BirthPlace & { name: string; country: string };
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isBirthDate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1900 && y <= 2100 && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function isTimeZone(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

const num = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Returns a clean copy, or null if anything is malformed (a bad cloud row must never break the app). */
export function sanitizeBirth(v: unknown): BirthData | null {
  if (!v || typeof v !== 'object') return null;
  const b = v as Record<string, unknown>;
  const p = b.place as Record<string, unknown> | null | undefined;
  if (!p || typeof p !== 'object') return null;
  if (!isBirthDate(b.date)) return null;
  if (b.time !== null && !(typeof b.time === 'string' && TIME_RE.test(b.time))) return null;
  if (!str(p.name, 80) || !str(p.country, 80)) return null;
  if (!num(p.latitude, -90, 90) || !num(p.longitude, -180, 180) || !isTimeZone(p.timeZone)) return null;
  return {
    date: b.date,
    time: b.time as string | null,
    place: { name: p.name, country: p.country, latitude: p.latitude, longitude: p.longitude, timeZone: p.timeZone },
  };
}

export const sameBirth = (a: BirthData | null, b: BirthData | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
