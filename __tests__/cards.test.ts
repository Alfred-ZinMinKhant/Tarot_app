import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readSources, serialise } from '../scripts/lib/card-files';
import {
  buildCards,
  type CardReviewFile,
  syllableCount,
  validateCards,
  validateReview,
  validateSources,
  wordCount,
} from '../scripts/lib/cards';
import { CARDS, getCard, normaliseSearch, searchCards, toRoman } from '../src/data/cards';
import { DECK } from '../src/data/deck';
import type { TarotCard } from '../src/data/types';

const clone = (): TarotCard[] => JSON.parse(JSON.stringify(CARDS)) as TarotCard[];

describe('card data', () => {
  it('has the full 78-card deck in canonical order', () => {
    expect(CARDS).toHaveLength(78);
    expect(CARDS.map((c) => c.id)).toEqual(DECK.map((d) => d.id));
    expect(CARDS.filter((c) => c.arcana === 'major')).toHaveLength(22);
    for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) {
      expect(CARDS.filter((c) => c.suit === suit)).toHaveLength(14);
    }
  });

  it('passes schema validation in both languages', () => {
    expect(validateCards([...CARDS])).toEqual([]);
    expect(validateSources(readSources())).toEqual([]);
  });

  it('matches what the build script generates from data/cards/*.json', () => {
    const onDisk = readFileSync(join(__dirname, '..', 'data', 'cards.json'), 'utf8');
    expect(onDisk).toBe(serialise(buildCards(readSources())));
  });

  it('lists every card in the Burmese review file', () => {
    const review = JSON.parse(
      readFileSync(join(__dirname, '..', 'data', 'cards.review.json'), 'utf8'),
    ) as CardReviewFile;
    expect(validateReview(review)).toEqual([]);
  });

  it('reports a missing field in either language', () => {
    const cards = clone();
    (cards[13]!.my.love as { upright?: string }).upright = '';
    delete (cards[40]!.en as { advice?: string }).advice;
    const errors = validateCards(cards);
    expect(errors).toContain('major-13-death.my.love.upright: missing or empty');
    expect(errors).toContain(`${cards[40]!.id}.en.advice: missing or empty`);
  });

  it('enforces length limits and keyword counts', () => {
    const cards = clone();
    cards[0]!.en.upright = 'Too short.';
    cards[0]!.en.keywords = ['one', 'two'];
    const errors = validateCards(cards);
    expect(errors.some((e) => e.startsWith('major-00-fool.en.upright: 2 words'))).toBe(true);
    expect(errors).toContain('major-00-fool.en.keywords: 2 keywords, expected 3–5');
  });

  it('rejects certainty claims, Zawgyi-looking text and duplicates', () => {
    const cards = clone();
    cards[1]!.en.money.upright = cards[1]!.en.money.upright + ' Success is guaranteed.';
    cards[2]!.my.name = 'ြမန်မာ';
    cards[3]!.en.name = cards[4]!.en.name;
    const errors = validateCards(cards);
    expect(errors.some((e) => e.startsWith('major-01-magician.en.money.upright: states an outcome'))).toBe(true);
    expect(errors).toContain('major-02-high-priestess.my.name: looks like Zawgyi, use Myanmar Unicode');
    expect(errors).toContain('duplicate en name: The Emperor');
  });

  it('counts English words and Burmese syllables', () => {
    expect(wordCount('  one two\nthree ')).toBe(3);
    // Orthographic syllables: a stacked consonant (here kinzi + ဂ) stays with the one before it.
    expect(syllableCount('မင်္ဂလာပါ')).toBe(3);
    expect(syllableCount('ဒီနေ့ ကတ်')).toBe(3);
  });
});

describe('search', () => {
  it('finds cards by English or Burmese name', () => {
    expect(searchCards('fool').map((c) => c.id)).toEqual(['major-00-fool']);
    expect(searchCards('လူအ').map((c) => c.id)).toContain('major-00-fool');
    expect(searchCards('ဒင်္ဂါး ဘုရင်မ').map((c) => c.id)).toEqual(['pentacles-13-queen']);
  });

  it('matches suit names in either language and combines with the suit filter', () => {
    expect(searchCards('cups')).toHaveLength(14);
    expect(searchCards('ခွက်')).toHaveLength(14);
    expect(searchCards('queen', 'swords').map((c) => c.id)).toEqual(['swords-13-queen']);
    expect(searchCards('', 'major')).toHaveLength(22);
  });

  it('ignores case, extra spaces and zero-width spaces', () => {
    expect(normaliseSearch('  The​  FOOL ')).toBe('the fool');
    expect(searchCards('THE   fool')).toHaveLength(1);
  });

  it('returns nothing for unknown words', () => {
    expect(searchCards('spaceship')).toEqual([]);
  });
});

describe('helpers', () => {
  it('formats Major Arcana numbers as on the cards', () => {
    expect(['0', 'I', 'IV', 'IX', 'XIV', 'XIX', 'XXI']).toEqual([0, 1, 4, 9, 14, 19, 21].map(toRoman));
  });

  it('looks cards up by id', () => {
    expect(getCard('cups-02-two')?.en.name).toBe('Two of Cups');
    expect(getCard('nope')).toBeUndefined();
  });
});
