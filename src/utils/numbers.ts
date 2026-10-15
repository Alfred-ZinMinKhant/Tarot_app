const BURMESE_DIGITS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'] as const;

/** Replaces Latin digits 0-9 in a string with Burmese digits ၀-၉. */
export function toBurmeseDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => BURMESE_DIGITS[Number(d)]!);
}

/** Replaces Burmese digits ၀-၉ in a string with Latin digits 0-9. */
export function toLatinDigits(text: string): string {
  return text.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040));
}

export type NumberFormatOptions = {
  burmeseNumerals?: boolean;
  /** Insert thousands separators (1,234). Defaults to true. */
  grouping?: boolean;
  minimumIntegerDigits?: number;
};

/**
 * Formats a number for display. Uses Latin digits unless `burmeseNumerals` is
 * set. Implemented without Intl so output is identical on Hermes builds that
 * ship without full ICU data.
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const { burmeseNumerals = false, grouping = true, minimumIntegerDigits = 1 } = options;
  if (!Number.isFinite(value)) return String(value);
  const negative = value < 0;
  const [intPart = '0', fracPart] = Math.abs(value).toString().split('.');
  let int = intPart.padStart(minimumIntegerDigits, '0');
  if (grouping) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let text = (negative ? '-' : '') + int + (fracPart ? `.${fracPart}` : '');
  if (burmeseNumerals) text = toBurmeseDigits(text);
  return text;
}
