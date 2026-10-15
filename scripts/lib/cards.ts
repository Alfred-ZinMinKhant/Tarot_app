/**
 * Builds `data/cards.json` from the deck structure + text batches, and validates the result.
 * Shared by `scripts/build-cards.ts`, `scripts/validate-cards.ts` and the Jest suite.
 */
import { DECK, ELEMENT_LABELS, SUIT_LABELS } from '../../src/data/deck';
import {
  type CardSource,
  type CardText,
  type CardTextSource,
  ELEMENTS,
  READING_AREAS,
  SUITS,
  type TarotCard,
} from '../../src/data/types';
import { LANGUAGES, type Language } from '../../src/i18n/languages';
import { burmeseSyllables, containsMyanmar, ZWSP } from '../../src/utils/myanmar';

/**
 * Length rules. English is counted in words (as in the brief). Burmese has no spaces between
 * words, so it is counted in syllables; the ranges were calibrated against the English targets
 * (≈1.8 Burmese syllables per English word) and are deliberately a little wider.
 */
export const LIMITS = {
  en: { long: [60, 90], short: [25, 40], advice: [6, 30] },
  my: { long: [100, 200], short: [40, 90], advice: [10, 60] },
} as const satisfies Record<Language, Record<string, readonly [number, number]>>;

export const KEYWORDS_RANGE = [3, 5] as const;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function syllableCount(text: string): number {
  return text
    .split(/\s+/)
    .flatMap((word) => burmeseSyllables(word))
    .filter((s) => containsMyanmar(s)).length;
}

export function textLength(text: string, lang: Language): number {
  return lang === 'en' ? wordCount(text) : syllableCount(text);
}

/** Phrases that state outcomes as certainties — the brief asks for reflective, gentle wording. */
const CERTAINTY_PATTERNS: RegExp[] = [
  /\byou will (die|be cured|get pregnant|win|lose (your|the) case)\b/i,
  /\bguarantee[sd]?\b/i,
  /\b(definitely|certainly) will\b/i,
  /\bwill (definitely|certainly)\b/i,
  /\bfatal\b/i,
  /သေချာပေါက်/,
  /အာမခံ/,
];

/**
 * Strong Zawgyi signals: a vowel sign ေ or medial ြ at the start of a word (Zawgyi stores them
 * before the consonant; Unicode after it), or Zawgyi's private stacked-form code points.
 */
const ZAWGYI_HINTS = /(^|[\s၊။])[ေြ]|[ၠ-႗]/;

export function buildCards(sources: CardSource[]): TarotCard[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return DECK.flatMap((entry) => {
    const src = byId.get(entry.id);
    if (!src) return [];
    const resolve = (lang: Language): CardText => ({
      ...src[lang],
      suit: SUIT_LABELS[entry.suit][lang],
      element: ELEMENT_LABELS[entry.element][lang],
      astrology: entry.astrology[lang],
    });
    return [
      {
        id: entry.id,
        arcana: entry.arcana,
        suit: entry.suit,
        number: entry.number,
        element: entry.element,
        commonsFile: entry.commonsFile,
        en: resolve('en'),
        my: resolve('my'),
      },
    ];
  });
}

export function validateSources(sources: CardSource[]): string[] {
  const errors: string[] = [];
  const known = new Set(DECK.map((d) => d.id));
  const seen = new Set<string>();
  for (const s of sources) {
    if (!known.has(s.id)) errors.push(`${s.id}: unknown card id`);
    if (seen.has(s.id)) errors.push(`${s.id}: defined more than once`);
    seen.add(s.id);
  }
  for (const d of DECK) if (!seen.has(d.id)) errors.push(`${d.id}: missing from data/cards/*.json`);
  return errors;
}

export function checkString(
  errors: string[],
  where: string,
  value: unknown,
  lang: Language,
  range?: readonly [number, number],
): void {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${where}: missing or empty`);
    return;
  }
  if (value !== value.trim()) errors.push(`${where}: leading/trailing whitespace`);
  if (value.includes(ZWSP)) errors.push(`${where}: contains U+200B (wrapping is done at render time)`);
  if (lang === 'my') {
    if (!containsMyanmar(value)) errors.push(`${where}: no Myanmar text`);
    if (ZAWGYI_HINTS.test(value)) errors.push(`${where}: looks like Zawgyi, use Myanmar Unicode`);
  } else if (containsMyanmar(value)) {
    errors.push(`${where}: Myanmar text in the English entry`);
  }
  for (const p of CERTAINTY_PATTERNS) {
    if (p.test(value)) errors.push(`${where}: states an outcome as a certainty (${p.source})`);
  }
  if (range) {
    const n = textLength(value, lang);
    const unit = lang === 'en' ? 'words' : 'syllables';
    if (n < range[0] || n > range[1]) {
      errors.push(`${where}: ${n} ${unit}, expected ${range[0]}–${range[1]}`);
    }
  }
}

function validateText(errors: string[], id: string, lang: Language, text: CardText | undefined) {
  const at = (field: string) => `${id}.${lang}.${field}`;
  if (!text || typeof text !== 'object') {
    errors.push(`${id}.${lang}: missing`);
    return;
  }
  const limits = LIMITS[lang];
  checkString(errors, at('name'), text.name, lang);
  checkString(errors, at('suit'), text.suit, lang);
  checkString(errors, at('element'), text.element, lang);
  checkString(errors, at('astrology'), text.astrology, lang);
  checkString(errors, at('upright'), text.upright, lang, limits.long);
  checkString(errors, at('reversed'), text.reversed, lang, limits.long);
  checkString(errors, at('advice'), text.advice, lang, limits.advice);

  if (!Array.isArray(text.keywords)) errors.push(`${at('keywords')}: missing`);
  else {
    const [min, max] = KEYWORDS_RANGE;
    if (text.keywords.length < min || text.keywords.length > max) {
      errors.push(`${at('keywords')}: ${text.keywords.length} keywords, expected ${min}–${max}`);
    }
    text.keywords.forEach((k, i) => checkString(errors, at(`keywords[${i}]`), k, lang));
    if (new Set(text.keywords).size !== text.keywords.length) {
      errors.push(`${at('keywords')}: duplicates`);
    }
  }

  for (const area of READING_AREAS) {
    const pair = text[area];
    if (!pair || typeof pair !== 'object') {
      errors.push(`${at(area)}: missing`);
      continue;
    }
    checkString(errors, at(`${area}.upright`), pair.upright, lang, limits.short);
    checkString(errors, at(`${area}.reversed`), pair.reversed, lang, limits.short);
  }

  const allowed = new Set<keyof CardText>([
    'name', 'suit', 'element', 'astrology', 'keywords', 'upright', 'reversed', 'advice',
    ...READING_AREAS,
  ]);
  for (const key of Object.keys(text)) {
    if (!allowed.has(key as keyof CardText)) errors.push(`${at(key)}: unknown field`);
  }
}

/** Validates the generated deck: 78 unique cards in canonical order, every field in both languages. */
export function validateCards(cards: TarotCard[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(cards)) return ['cards.json: expected an array'];
  if (cards.length !== DECK.length) errors.push(`expected ${DECK.length} cards, found ${cards.length}`);

  cards.forEach((card, i) => {
    const expected = DECK[i];
    const id = card?.id ?? `#${i}`;
    if (!expected || card.id !== expected.id) {
      errors.push(`${id}: expected ${expected?.id ?? 'nothing'} at position ${i}`);
      return;
    }
    if (!(SUITS as readonly string[]).includes(card.suit)) errors.push(`${id}: bad suit`);
    if (!(ELEMENTS as readonly string[]).includes(card.element)) errors.push(`${id}: bad element`);
    if (card.arcana !== expected.arcana || card.number !== expected.number) {
      errors.push(`${id}: arcana/number do not match the deck table`);
    }
    if (!/\.jpg$/.test(card.commonsFile)) errors.push(`${id}: commonsFile should be a .jpg name`);
    for (const lang of LANGUAGES) validateText(errors, id, lang, card[lang]);
    if (card.en?.name && card.my?.name && card.en.name === card.my.name) {
      errors.push(`${id}: Burmese name is identical to the English name`);
    }
  });

  const names = (lang: Language) => cards.map((c) => c?.[lang]?.name);
  for (const lang of LANGUAGES) {
    const dupes = names(lang).filter((n, i, all) => n && all.indexOf(n) !== i);
    for (const d of new Set(dupes)) errors.push(`duplicate ${lang} name: ${d}`);
  }
  return errors;
}

export type CardReviewFile = { _note?: string; pending: string[]; reviewed: string[] };

/** Every card must be listed exactly once, as either pending native-speaker review or reviewed. */
export function validateReview(review: CardReviewFile): string[] {
  const errors: string[] = [];
  const known = new Set(DECK.map((d) => d.id));
  const listed = [...(review.pending ?? []), ...(review.reviewed ?? [])];
  const seen = new Set<string>();
  for (const id of listed) {
    if (!known.has(id)) errors.push(`cards.review.json: unknown card id ${id}`);
    if (seen.has(id)) errors.push(`cards.review.json: ${id} listed more than once`);
    seen.add(id);
  }
  for (const id of known) if (!seen.has(id)) errors.push(`cards.review.json: ${id} is not listed`);
  return errors;
}

export type { CardSource, CardTextSource };
