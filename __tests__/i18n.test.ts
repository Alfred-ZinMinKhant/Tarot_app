import { checkLocales, flatten, type ReviewFile } from '../scripts/lib/i18n-check';

import en from '../locales/en.json';
import my from '../locales/my.json';
import review from '../locales/my.review.json';

import { languageFromLocaleTag } from '@/i18n/languages';

describe('locale files', () => {
  it('have identical keys, matching placeholders and a complete review list', () => {
    expect(checkLocales(en, my, review as ReviewFile)).toEqual([]);
  });

  it('never contain Zawgyi-only code points patterns', () => {
    // Zawgyi commonly stores medial-ra (ြ) before the consonant; in Unicode it
    // must follow one. A ြ at the start of a word is a strong Zawgyi signal.
    for (const [key, value] of Object.entries(flatten(my))) {
      expect([key, /(^|[\s၊။])ြ/.test(String(value))]).toEqual([key, false]);
    }
  });

  it('detects bad locale pairs', () => {
    const errors = checkLocales(
      { a: 'Hi {{name}}', b: 'x' },
      { a: 'မင်္ဂလာပါ', c: 'y' },
      { pending: ['a'], reviewed: [] },
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        'my.json is missing key "b"',
        'en.json is missing key "c"',
        '"a" placeholders differ: en=[name] my=[]',
        'my.review.json does not list "c" (add it to "pending" or "reviewed")',
      ]),
    );
  });
});

describe('languageFromLocaleTag', () => {
  it.each([
    ['my-MM', 'my'],
    ['my', 'my'],
    ['MY_mm', 'my'],
    ['en-US', 'en'],
    ['th-TH', 'en'],
    [undefined, 'en'],
  ])('%s → %s', (tag, lang) => {
    expect(languageFromLocaleTag(tag)).toBe(lang);
  });
});
