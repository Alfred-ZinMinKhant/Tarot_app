import { cardForSign } from '../src/astro/astroCards';
import type { Chart } from '../src/astro/chart';
import { dailyAstroLink } from '../src/astro/dailyLink';
import { getCard } from '../src/data/cards';
import { pairNotes, PAIRS, suggestTopic, summarize } from '../src/engine';

const chart = (over: Partial<Chart> = {}): Chart => ({
  utc: new Date(),
  timeKnown: false,
  planets: [{ id: 'sun', lon: 130, sign: 'leo', degree: 10, retrograde: false, house: null }],
  ascendant: null,
  midheaven: null,
  aspects: [],
  elements: { fire: 4, earth: 2, air: 2, water: 2 },
  moonSignAmbiguous: null,
  ...over,
});

describe('card pair notes', () => {
  it('only references real cards and has text in both languages', () => {
    for (const p of PAIRS) {
      expect(getCard(p.a)).toBeDefined();
      expect(getCard(p.b)).toBeDefined();
      expect(p.en.trim()).not.toBe('');
      expect(p.my.trim()).not.toBe('');
    }
  });

  it('adds a note when both cards appear, either way up and in any order', () => {
    const drawn = [
      { cardId: 'major-17-star', reversed: true },
      { cardId: 'cups-05-five', reversed: false },
      { cardId: 'major-16-tower', reversed: false },
    ];
    expect(pairNotes(drawn, 'en')).toHaveLength(1);
    expect(summarize(drawn, 'en').filter((l) => l.key === 'pair')).toHaveLength(1);
    expect(pairNotes([{ cardId: 'major-16-tower', reversed: false }], 'en')).toEqual([]);
  });
});

describe('suggestTopic', () => {
  it('spots the subject of a question, in English and Burmese', () => {
    expect(suggestTopic('Should I quit my job and ask for a promotion?')).toBe('career');
    expect(suggestTopic('Does my boyfriend still love me?')).toBe('love');
    expect(suggestTopic('Can I afford the rent and pay off my debt?')).toBe('money');
    expect(suggestTopic('အလုပ်ပြောင်းသင့်လား')).toBe('career');
    expect(suggestTopic('What should I focus on?')).toBeNull();
    expect(suggestTopic('  ')).toBeNull();
  });
});

describe('daily card and birth chart', () => {
  it('recognises the card of the Sun sign', () => {
    const id = cardForSign('leo')!;
    expect(dailyAstroLink(id, chart())).toEqual({ kind: 'sun', sign: 'leo' });
  });

  it('falls back to an element match, then to nothing', () => {
    expect(dailyAstroLink('wands-02-two', chart())).toMatchObject({ kind: 'elementSun', element: 'fire' });
    expect(dailyAstroLink('cups-02-two', chart())).toBeNull();
    expect(dailyAstroLink('cups-02-two', chart({ elements: { fire: 1, earth: 1, air: 1, water: 5 } }))).toEqual({
      kind: 'elementDominant',
      element: 'water',
    });
  });

  it('does not claim a Moon-sign link when the Moon sign is uncertain', () => {
    const moonCard = cardForSign('cancer')!;
    const c = chart({ planets: [{ id: 'moon', lon: 100, sign: 'cancer', degree: 10, retrograde: false, house: null }], moonSignAmbiguous: ['gemini', 'cancer'] });
    expect(dailyAstroLink(moonCard, c)?.kind).not.toBe('moon');
  });
});
