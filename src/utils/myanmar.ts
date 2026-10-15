/**
 * Myanmar (Burmese) Unicode text helpers.
 *
 * The app uses Myanmar Unicode only (never Zawgyi). Fonts are bundled so the
 * text renders correctly regardless of the device's system font.
 */

export const ZWSP = '​';

const MYANMAR_RANGES: [number, number][] = [
  [0x1000, 0x109f], // Myanmar
  [0xa9e0, 0xa9ff], // Myanmar Extended-B
  [0xaa60, 0xaa7f], // Myanmar Extended-A
];

export function isMyanmarCodePoint(cp: number): boolean {
  return MYANMAR_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

export function containsMyanmar(text: string): boolean {
  for (const ch of text) {
    if (isMyanmarCodePoint(ch.codePointAt(0)!)) return true;
  }
  return false;
}

const ASAT = 0x103a; // ်  (killer)
const VIRAMA = 0x1039; // ္  (stacker)
const DOT_BELOW = 0x1037; // ့

function isConsonant(cp: number): boolean {
  return (cp >= 0x1000 && cp <= 0x1021) || cp === 0x103f; // က..အ, ဿ
}

function isIndependentVowel(cp: number): boolean {
  return (cp >= 0x1023 && cp <= 0x102a) || cp === 0x104c || cp === 0x104d || cp === 0x104e || cp === 0x104f;
}

function isMyanmarDigit(cp: number): boolean {
  return cp >= 0x1040 && cp <= 0x1049;
}

/**
 * Returns true when position `i` (a code-point index into `cps`) starts a new
 * Burmese syllable. Rule (after Ye Kyaw Thu's "sylbreak"): a consonant starts
 * a syllable unless it is stacked under the previous one (preceded by ္), or
 * is itself killed/stacked (followed by ်, ္ or ့ ်).
 */
function startsSyllable(cps: number[], i: number): boolean {
  const cp = cps[i]!;
  if (isIndependentVowel(cp)) return true;
  if (isMyanmarDigit(cp)) return !isMyanmarDigit(cps[i - 1] ?? 0);
  if (!isConsonant(cp)) return false;
  if (cps[i - 1] === VIRAMA) return false;
  let next = cps[i + 1];
  if (next === DOT_BELOW) next = cps[i + 2];
  if (next === ASAT || next === VIRAMA) return false;
  return true;
}

/**
 * Inserts zero-width spaces between Burmese syllables so that React Native's
 * line breaker (which only breaks at spaces / break opportunities) can wrap
 * long Burmese strings cleanly inside cards and buttons. Latin text, spaces
 * and punctuation are left untouched. Idempotent.
 */
export function breakBurmese(text: string): string {
  if (!containsMyanmar(text)) return text;
  const cps = Array.from(stripZwsp(text), (c) => c.codePointAt(0)!);
  let out = '';
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    const prev = cps[i - 1];
    if (
      i > 0 &&
      prev !== undefined &&
      isMyanmarCodePoint(prev) &&
      !isPunctuation(prev) &&
      startsSyllable(cps, i)
    ) {
      out += ZWSP;
    }
    out += String.fromCodePoint(cp);
  }
  return out;
}

function isPunctuation(cp: number): boolean {
  return cp === 0x104a || cp === 0x104b; // ၊ ။
}

/** Removes zero-width spaces (e.g. before storing, searching or copying text). */
export function stripZwsp(text: string): string {
  return text.replace(/​/g, '');
}

/** Splits a string into Burmese syllables (useful for tests and search). */
export function burmeseSyllables(text: string): string[] {
  return breakBurmese(text).split(ZWSP).filter(Boolean);
}
