/**
 * Locale consistency checks shared by `npm run check:i18n` and the Jest suite.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type ReviewFile = {
  _note?: string;
  /** Burmese keys written by AI that still need a native-speaker review. */
  pending: string[];
  /** Burmese keys a native speaker has approved. */
  reviewed: string[];
};

/** Flattens nested objects to dotted keys: { a: { b: "x" } } → { "a.b": "x" }. */
export function flatten(obj: Json, prefix = '', out: Record<string, Json> = {}): Record<string, Json> {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = obj;
  }
  return out;
}

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}|\$t\(([\w.]+)\)/g;

export function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1] ?? `$t(${m[2]})`).sort();
}

export function checkLocales(en: Json, my: Json, review: ReviewFile): string[] {
  const errors: string[] = [];
  const fe = flatten(en);
  const fm = flatten(my);

  for (const key of Object.keys(fe)) if (!(key in fm)) errors.push(`my.json is missing key "${key}"`);
  for (const key of Object.keys(fm)) if (!(key in fe)) errors.push(`en.json is missing key "${key}"`);

  for (const [key, ev] of Object.entries(fe)) {
    const mv = fm[key];
    if (mv === undefined) continue;
    if (typeof ev !== 'string' || typeof mv !== 'string') {
      errors.push(`"${key}" must be a string in both locales`);
      continue;
    }
    if (!ev.trim() || !mv.trim()) errors.push(`"${key}" is empty in ${!ev.trim() ? 'en' : 'my'}.json`);
    const pe = placeholders(ev).join(',');
    const pm = placeholders(mv).join(',');
    if (pe !== pm) errors.push(`"${key}" placeholders differ: en=[${pe}] my=[${pm}]`);
    if (/[က-႟]/.test(mv) && /​/.test(mv)) {
      errors.push(`"${key}" in my.json contains zero-width spaces; line breaks are added at runtime`);
    }
  }

  const listed = new Set([...review.pending, ...review.reviewed]);
  for (const key of Object.keys(fm)) {
    if (!listed.has(key)) errors.push(`my.review.json does not list "${key}" (add it to "pending" or "reviewed")`);
  }
  for (const key of listed) {
    if (!(key in fm)) errors.push(`my.review.json lists unknown key "${key}"`);
  }
  const both = review.pending.filter((k) => review.reviewed.includes(k));
  for (const key of both) errors.push(`my.review.json lists "${key}" as both pending and reviewed`);

  return errors;
}

/** Adds every Burmese key not yet listed to `pending` (used after writing new strings). */
export function syncReview(my: Json, review: ReviewFile): ReviewFile {
  const keys = Object.keys(flatten(my));
  const reviewed = review.reviewed.filter((k) => keys.includes(k));
  const pending = keys.filter((k) => !reviewed.includes(k));
  return { ...review, pending, reviewed };
}
