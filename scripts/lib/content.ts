/**
 * Schema checks for the non-card content files, shared by `npm run check:content` and Jest:
 * data/spreads.json, data/lessons.json, data/weekday-signs.json and data/legal.json.
 */
import { LANGUAGES } from '../../src/i18n/languages';
import { checkString } from './cards';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function uniqueIds(errors: string[], file: string, items: unknown[]): void {
  const seen = new Set<string>();
  for (const it of items) {
    const id = isObj(it) ? it.id : undefined;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
      errors.push(`${file}: every entry needs a kebab-case "id"`);
      continue;
    }
    if (seen.has(id)) errors.push(`${file}: duplicate id "${id}"`);
    seen.add(id);
  }
}

/** Checks `fields` exist as non-empty Unicode strings in every language of `entry`. */
function checkLocalized(errors: string[], where: string, entry: Obj, fields: string[]): void {
  for (const lang of LANGUAGES) {
    const block = entry[lang];
    if (!isObj(block)) {
      errors.push(`${where}.${lang}: missing`);
      continue;
    }
    for (const f of fields) checkString(errors, `${where}.${lang}.${f}`, block[f], lang);
  }
}

function checkStringList(errors: string[], where: string, entry: Obj, field: string, size: number): void {
  for (const lang of LANGUAGES) {
    const list = isObj(entry[lang]) ? (entry[lang] as Obj)[field] : undefined;
    if (!Array.isArray(list) || list.length !== size) {
      errors.push(`${where}.${lang}.${field}: expected ${size} entries`);
      continue;
    }
    list.forEach((v, i) => checkString(errors, `${where}.${lang}.${field}[${i}]`, v, lang));
  }
}

export function validateSpreads(spreads: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(spreads) || spreads.length === 0) return ['spreads.json: expected a non-empty array'];
  uniqueIds(errors, 'spreads.json', spreads);
  for (const s of spreads as Obj[]) {
    const where = `spread ${String(s.id)}`;
    checkLocalized(errors, where, s, ['name', 'description']);
    const positions = s.positions;
    if (!Array.isArray(positions)) {
      errors.push(`${where}: positions missing`);
      continue;
    }
    if (positions.length !== s.cardCount) errors.push(`${where}: cardCount ${String(s.cardCount)} ≠ ${positions.length} positions`);
    uniqueIds(errors, where, positions);
    for (const p of positions as Obj[]) {
      const pw = `${where}/${String(p.id)}`;
      if (typeof p.x !== 'number' || typeof p.y !== 'number' || p.x < 0 || p.y < 0) {
        errors.push(`${pw}: x and y must be non-negative numbers`);
      }
      checkLocalized(errors, pw, p, ['name', 'prompt']);
    }
  }
  return errors;
}

export const LESSON_COUNT = [6, 8] as const;

export function validateLessons(lessons: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(lessons)) return ['lessons.json: expected an array'];
  if (lessons.length < LESSON_COUNT[0] || lessons.length > LESSON_COUNT[1]) {
    errors.push(`lessons.json: ${lessons.length} lessons, expected ${LESSON_COUNT[0]}–${LESSON_COUNT[1]}`);
  }
  uniqueIds(errors, 'lessons.json', lessons);
  for (const l of lessons as Obj[]) {
    const where = `lesson ${String(l.id)}`;
    checkLocalized(errors, where, l, ['title', 'summary']);
    const counts = LANGUAGES.map((lang) => {
      const sections = isObj(l[lang]) ? (l[lang] as Obj).sections : undefined;
      if (!Array.isArray(sections) || sections.length < 2) {
        errors.push(`${where}.${lang}.sections: expected at least 2 sections`);
        return -1;
      }
      (sections as Obj[]).forEach((sec, i) => {
        checkString(errors, `${where}.${lang}.sections[${i}].heading`, sec.heading, lang);
        checkString(errors, `${where}.${lang}.sections[${i}].body`, sec.body, lang);
      });
      return sections.length;
    });
    if (new Set(counts).size > 1) errors.push(`${where}: languages have different section counts`);
  }
  return errors;
}

/** Burmese astrology: Sunday–Saturday plus Rahu (Wednesday afternoon) — eight signs. */
export const SIGN_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'rahu', 'thursday', 'friday', 'saturday'];
export const MOODS_PER_SIGN = 5;

/** Wording that would turn an entertainment feature into health or money advice. */
const SIGN_FORBIDDEN: RegExp[] = [
  /\b(illness|disease|sick|cure|lottery|invest|stock|profit|wealth|rich)\b/i,
  /ရောဂါ|ထီ|ရင်းနှီးမြှုပ်နှံ|အမြတ်/,
];

export function validateSigns(signs: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(signs)) return ['weekday-signs.json: expected an array'];
  uniqueIds(errors, 'weekday-signs.json', signs);
  const ids = (signs as Obj[]).map((s) => s.id);
  if (ids.join() !== SIGN_IDS.join()) errors.push(`weekday-signs.json: expected ids in order ${SIGN_IDS.join(', ')}`);
  for (const s of signs as Obj[]) {
    const where = `sign ${String(s.id)}`;
    if (typeof s.weekday !== 'number' || s.weekday < 0 || s.weekday > 6) errors.push(`${where}: weekday must be 0–6`);
    checkLocalized(errors, where, s, ['name', 'animal', 'planet', 'direction', 'personality']);
    checkStringList(errors, where, s, 'traits', 3);
    checkStringList(errors, where, s, 'moods', MOODS_PER_SIGN);
    const text = JSON.stringify(s);
    for (const p of SIGN_FORBIDDEN) if (p.test(text)) errors.push(`${where}: health/finance wording (${p.source})`);
  }
  return errors;
}

export const LEGAL_DOCS = ['privacy', 'terms'];

export function validateLegal(legal: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(legal)) return ['legal.json: expected an object'];
  for (const doc of LEGAL_DOCS) {
    const d = legal[doc];
    if (!isObj(d)) {
      errors.push(`legal.json: "${doc}" missing`);
      continue;
    }
    checkLocalized(errors, `legal ${doc}`, d, ['title']);
    const counts = LANGUAGES.map((lang) => {
      const sections = isObj(d[lang]) ? (d[lang] as Obj).sections : undefined;
      if (!Array.isArray(sections) || sections.length === 0) {
        errors.push(`legal ${doc}.${lang}.sections: missing`);
        return -1;
      }
      (sections as Obj[]).forEach((sec, i) => {
        checkString(errors, `legal ${doc}.${lang}.sections[${i}].heading`, sec.heading, lang);
        checkString(errors, `legal ${doc}.${lang}.sections[${i}].body`, sec.body, lang);
      });
      return sections.length;
    });
    if (new Set(counts).size > 1) errors.push(`legal ${doc}: languages have different section counts`);
  }
  return errors;
}

export type ContentReviewFile = { _note?: string; pending: string[]; reviewed: string[] };

/** Every entry in data/content.review.json must name real content ("lessons/<id>", …). */
export function validateContentReview(
  review: ContentReviewFile,
  known: { lessons: string[]; signs: string[] },
): string[] {
  const valid = new Set([
    ...known.lessons.map((id) => `lessons/${id}`),
    ...known.signs.map((id) => `weekday-signs/${id}`),
    ...LEGAL_DOCS.map((d) => `legal/${d}`),
    'spreads/all',
  ]);
  const errors: string[] = [];
  const all = [...review.pending, ...review.reviewed];
  for (const k of all) if (!valid.has(k)) errors.push(`content.review.json: unknown entry "${k}"`);
  for (const k of valid) if (!all.includes(k)) errors.push(`content.review.json: "${k}" is neither pending nor reviewed`);
  return errors;
}
