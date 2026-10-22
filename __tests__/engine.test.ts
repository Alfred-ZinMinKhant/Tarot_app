import spreadsJson from '../data/spreads.json';
import topicPrompts from '../data/topic-prompts.json';
import { getCard } from '../src/data/cards';
import {
  answerQuestion,
  classifyQuestion,
  dailyCard,
  DECK_IDS,
  detectCrisis,
  drawCards,
  getSpread,
  hashString,
  layoutSize,
  positionPrompt,
  prepareDeck,
  readingText,
  secureRandom,
  secureRandomInt,
  seededRandom,
  shuffle,
  SPREADS,
  summarize,
} from '../src/engine';

describe('secure random integers', () => {
  it('stays in range and covers every value', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = secureRandom(78);
      expect(Number.isInteger(n) && n >= 0 && n < 78).toBe(true);
      seen.add(n);
    }
    expect(seen.size).toBe(78);
  });

  it('rejects values that would cause modulo bias', () => {
    // max = 3: limit = floor(2^32 / 3) * 3 = 4294967295, so 0xFFFFFFFF must be redrawn.
    const queue = [
      new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      new Uint8Array([0, 0, 0, 5]),
    ];
    const bytes = jest.fn(() => queue.shift()!);
    expect(secureRandomInt(3, bytes)).toBe(5 % 3);
    expect(bytes).toHaveBeenCalledTimes(2);
  });

  it('refuses invalid ranges', () => {
    expect(() => secureRandom(0)).toThrow(RangeError);
    expect(() => secureRandom(2.5)).toThrow(RangeError);
  });
});

describe('shuffle and draws', () => {
  it('shuffles without losing or duplicating cards', () => {
    const shuffled = shuffle(DECK_IDS);
    expect(shuffled).toHaveLength(78);
    expect(new Set(shuffled).size).toBe(78);
    expect([...shuffled].sort()).toEqual([...DECK_IDS].sort());
  });

  it('is unbiased: every ordering of three items is about equally likely', () => {
    const rand = seededRandom(42);
    const counts = new Map<string, number>();
    const trials = 60000;
    for (let i = 0; i < trials; i++) {
      const key = shuffle(['a', 'b', 'c'], rand).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const c of counts.values()) expect(Math.abs(c - trials / 6) / (trials / 6)).toBeLessThan(0.05);
  });

  it('never repeats a card within a spread', () => {
    for (let i = 0; i < 2000; i++) {
      const ids = drawCards(10).map((d) => d.cardId);
      expect(new Set(ids).size).toBe(10);
    }
    expect(new Set(drawCards(78).map((d) => d.cardId)).size).toBe(78);
    expect(() => drawCards(79)).toThrow(RangeError);
  });

  it('reverses about half the cards when reversals are on', () => {
    const draws = 20000;
    let reversed = 0;
    for (let i = 0; i < draws / 10; i++) reversed += drawCards(10).filter((d) => d.reversed).length;
    const ratio = reversed / draws;
    expect(ratio).toBeGreaterThan(0.47);
    expect(ratio).toBeLessThan(0.53);
  });

  it('never reverses cards when reversals are off', () => {
    const deck = prepareDeck({ reversals: false });
    expect(deck.some((d) => d.reversed)).toBe(false);
  });

  it('is reproducible with a seeded source (for tests)', () => {
    expect(drawCards(5, { rand: seededRandom(7) })).toEqual(drawCards(5, { rand: seededRandom(7) }));
  });
});

describe('daily card', () => {
  it('is the same all day for the same person', () => {
    const a = dailyCard('seed-123', '2026-10-15');
    expect(dailyCard('seed-123', '2026-10-15')).toEqual(a);
    expect(DECK_IDS).toContain(a.cardId);
  });

  it('varies by date and by person', () => {
    const days = Array.from({ length: 365 }, (_, i) => dailyCard('seed-123', `day-${i}`).cardId);
    expect(new Set(days).size).toBeGreaterThan(60);
    const people = Array.from({ length: 50 }, (_, i) => dailyCard(`person-${i}`, '2026-10-15').cardId);
    expect(new Set(people).size).toBeGreaterThan(20);
  });

  it('keeps the same card when reversals are switched off, just upright', () => {
    for (let i = 0; i < 30; i++) {
      const on = dailyCard('s', `d${i}`);
      const off = dailyCard('s', `d${i}`, { reversals: false });
      expect(off).toEqual({ cardId: on.cardId, reversed: false });
    }
  });

  it('reverses roughly half of the days', () => {
    const reversed = Array.from({ length: 2000 }, (_, i) => dailyCard('s', `d${i}`).reversed).filter(Boolean);
    expect(reversed.length / 2000).toBeGreaterThan(0.44);
    expect(reversed.length / 2000).toBeLessThan(0.56);
  });

  it('hashes strings deterministically', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('spreads', () => {
  it('defines the five spreads from the brief', () => {
    expect(SPREADS.map((s) => [s.id, s.cardCount])).toEqual([
      ['one-card', 1],
      ['three-past-present-future', 3],
      ['three-situation-challenge-advice', 3],
      ['love', 5],
      ['celtic-cross', 10],
    ]);
  });

  it('has a named, described position for every card, in both languages', () => {
    for (const s of spreadsJson) {
      expect(s.positions).toHaveLength(s.cardCount);
      expect(new Set(s.positions.map((p) => p.id)).size).toBe(s.cardCount);
      for (const lang of ['en', 'my'] as const) {
        expect(s[lang].name.trim()).not.toBe('');
        expect(s[lang].description.trim()).not.toBe('');
        for (const p of s.positions) {
          expect(p[lang].name.trim()).not.toBe('');
          expect(p[lang].prompt.trim()).not.toBe('');
        }
      }
    }
  });

  it('computes layout bounds', () => {
    expect(layoutSize(getSpread('three-past-present-future')!)).toEqual({ width: 3, height: 1 });
    expect(layoutSize(getSpread('celtic-cross')!)).toEqual({ width: 5.4, height: 4 });
    expect(getSpread('nope')).toBeUndefined();
  });
});

describe('interpretation', () => {
  const fool = getCard('major-00-fool')!;

  it('uses the topic reading when there is one', () => {
    expect(readingText(fool, false, 'love', 'en')).toBe(fool.en.love.upright);
    expect(readingText(fool, true, 'money', 'my')).toBe(fool.my.money.reversed);
    expect(readingText(fool, true, 'general', 'en')).toBe(fool.en.reversed);
    expect(readingText(fool, false, 'question', 'my')).toBe(fool.my.upright);
  });

  it('summarises patterns in the spread', () => {
    const lines = summarize(
      [
        { cardId: 'cups-02-two', reversed: false },
        { cardId: 'cups-06-six', reversed: false },
        { cardId: 'swords-04-four', reversed: false },
      ],
      'en',
    );
    expect(lines.map((l) => l.key)).toEqual(['majorsNone', 'suitCups', 'allUpright', 'keywords', 'advice']);
    expect(lines[3]!.params!.keywords).toBe('partnership, nostalgia, rest');
    expect(lines[4]!.params!.advice).toBe(getCard('swords-04-four')!.en.advice);
  });

  it('notices many Major Arcana and many reversals, and joins Burmese lists with ၊', () => {
    const lines = summarize(
      [
        { cardId: 'major-13-death', reversed: true },
        { cardId: 'major-17-star', reversed: true },
        { cardId: 'wands-01-ace', reversed: false },
      ],
      'my',
    );
    expect(lines.map((l) => l.key)).toEqual(['majorsMany', 'reversedMany', 'keywords', 'advice']);
    expect(lines[2]!.params!.keywords).toContain('၊ ');
  });

  it('keeps one-card summaries short', () => {
    expect(summarize([{ cardId: 'major-00-fool', reversed: false }], 'en').map((l) => l.key)).toEqual([
      'keywords',
      'advice',
    ]);
  });
});

describe('crisis detection', () => {
  it.each([
    'I want to die',
    'Should I KILL   MYSELF?',
    'thinking about self-harm',
    'ငါ သေချင်တယ်',
    'ကိုယ့်ကိုယ်ကိုသတ်သေဖို့ စဉ်းစားနေတယ်',
    'အသက်​မရှင်ချင်တော့ဘူး',
  ])('flags "%s"', (q) => {
    expect(detectCrisis(q)).toBe(true);
  });

  it.each([
    '',
    'Will my diet work?',
    'Is this the right time to change jobs?',
    'ဒီအလုပ် သေချာလား',
    'အချစ်ရေး ဘယ်လိုလဲ',
  ])('does not flag "%s"', (q) => {
    expect(detectCrisis(q)).toBe(false);
  });
});

describe('ids', () => {
  it('creates RFC 4122 v4 UUIDs', () => {
    const { uuidV4 } = jest.requireActual<typeof import('../src/utils/id')>('../src/utils/id');
    const ids = Array.from({ length: 200 }, () => uuidV4());
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(200);
  });
});

describe('topic-aware readings', () => {
  const spread = [
    { cardId: 'cups-02-two', reversed: false },
    { cardId: 'cups-06-six', reversed: false },
    { cardId: 'swords-04-four', reversed: false },
  ];

  it('flavours the summary for a life area and leaves general untouched', () => {
    const love = summarize(spread, 'en', { topic: 'love' });
    expect(love.map((l) => l.key)).toEqual([
      'intro.love',
      'majorsNone',
      'suit.love.cups',
      'allUpright',
      'keywords',
      'adviceTopic.love',
    ]);
    expect(summarize(spread, 'en', { topic: 'general' })).toEqual(summarize(spread, 'en'));
  });

  it('rewords position prompts per topic and falls back to the default', () => {
    const three = getSpread('three-past-present-future')!;
    const past = three.positions[0]!;
    expect(positionPrompt(three.id, past, 'money', 'en')).toBe(topicPrompts['three-past-present-future'].past.money.en);
    expect(positionPrompt(three.id, past, 'general', 'en')).toBe(past.en.prompt);
    const love = getSpread('love')!;
    expect(positionPrompt(love.id, love.positions[0]!, 'money', 'my')).toBe(love.positions[0]!.my.prompt);
  });

  it('only overrides prompts for real spread positions', () => {
    for (const [spreadId, positions] of Object.entries(topicPrompts)) {
      const spread = getSpread(spreadId)!;
      expect(spread).toBeDefined();
      for (const [positionId, topics] of Object.entries(positions)) {
        expect(spread.positions.some((p) => p.id === positionId)).toBe(true);
        expect(Object.keys(topics).sort()).toEqual(['career', 'health', 'love', 'money']);
      }
    }
  });

  it('weights the draw towards the topic suits without duplicates or bias for general', () => {
    const deck = prepareDeck({ topic: 'money', rand: seededRandom(5) });
    expect(deck).toHaveLength(78);
    expect(new Set(deck.map((d) => d.cardId)).size).toBe(78);
    const top = (topic?: string) => {
      let pentacles = 0;
      for (let seed = 0; seed < 300; seed++) {
        const d = prepareDeck({ topic, rand: seededRandom(seed) }).slice(0, 10);
        pentacles += d.filter((c) => getCard(c.cardId)!.suit === 'pentacles').length;
      }
      return pentacles / 300;
    };
    expect(top('money')).toBeGreaterThan(top('general') + 0.4);
  });
});

describe('answering the question', () => {
  it('classifies questions', () => {
    expect(classifyQuestion('Should I take the job?')).toBe('yesno');
    expect(classifyQuestion('Will he text me back')).toBe('yesno');
    expect(classifyQuestion('When will I move?')).toBe('when');
    expect(classifyQuestion('What do I need to know about my career')).toBe('open');
    expect(classifyQuestion('  ')).toBe('open');
  });

  it('leans on favourable cards, and the last card counts double', () => {
    const good = [
      { cardId: 'major-19-sun', reversed: false },
      { cardId: 'cups-10-ten', reversed: false },
    ];
    expect(answerQuestion(good, 'Will it work out?', 'general')!.verdict).toBe('yes');
    const bad = [
      { cardId: 'major-16-tower', reversed: false },
      { cardId: 'swords-10-ten', reversed: false },
    ];
    expect(answerQuestion(bad, 'Will it work out?', 'general')!.verdict).toBe('no');
    const mixed = [
      { cardId: 'major-19-sun', reversed: false },
      { cardId: 'swords-10-ten', reversed: false },
    ];
    expect(answerQuestion(mixed, 'Will it work out?', 'general')!.verdict).toBe('leaningNo');
  });

  it('gives timing for "when", no verdict for health, and nothing without a question', () => {
    const wands = [{ cardId: 'wands-03-three', reversed: true }];
    const when = answerQuestion(wands, 'When will it happen?', 'general')!;
    expect(when).toMatchObject({ kind: 'when', timing: 'wands', delayed: true });
    expect(answerQuestion(wands, 'Will I get better?', 'health')!.verdict).toBeUndefined();
    expect(answerQuestion(wands, '   ', 'general')).toBeNull();
  });
});
