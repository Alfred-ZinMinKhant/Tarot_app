export const LANGUAGES = ['en', 'my'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Device locale → app language. Burmese for any `my*` locale, English otherwise. */
export function languageFromLocaleTag(tag: string | null | undefined): Language {
  if (!tag) return 'en';
  return tag.toLowerCase().split(/[-_]/)[0] === 'my' ? 'my' : 'en';
}
