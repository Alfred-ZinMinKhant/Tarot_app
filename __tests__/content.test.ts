import legal from '../data/legal.json';
import lessons from '../data/lessons.json';
import spreads from '../data/spreads.json';
import signs from '../data/weekday-signs.json';
import { validateLegal, validateLessons, validateSigns, validateSpreads } from '../scripts/lib/content';

import {
  dailyMood,
  getSign,
  LESSONS,
  nextLesson,
  renderLegal,
  SIGN_BEARING,
  SIGN_IDS,
  SIGNS,
  signForBirthDate,
  signForWeekday,
} from '@/data/content';

describe('content files', () => {
  it('pass schema validation', () => {
    expect(validateSpreads(spreads)).toEqual([]);
    expect(validateLessons(lessons)).toEqual([]);
    expect(validateSigns(signs)).toEqual([]);
    expect(validateLegal(legal)).toEqual([]);
  });

  it('catch common mistakes', () => {
    const broken = JSON.parse(JSON.stringify(signs));
    broken[0].my.moods.pop();
    broken[1].en.personality = 'Expect a lottery win.';
    broken[2].my.name = 'Tiger';
    const errors = validateSigns(broken);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sign sunday.my.moods'),
        expect.stringContaining('health/finance'),
        expect.stringContaining('sign tuesday.my.name: no Myanmar text'),
      ]),
    );
    const lessonsBroken = JSON.parse(JSON.stringify(lessons));
    lessonsBroken[0].my.sections.pop();
    expect(validateLessons(lessonsBroken).join()).toContain('different section counts');
  });
});

describe('weekday signs', () => {
  it('has eight signs including Rahu', () => {
    expect(SIGNS.map((s) => s.id)).toEqual([...SIGN_IDS]);
    expect(new Set(Object.values(SIGN_BEARING)).size).toBe(8);
  });

  it('maps weekdays, splitting Wednesday at noon', () => {
    expect(signForWeekday(0)).toBe('sunday');
    expect(signForWeekday(3)).toBe('wednesday');
    expect(signForWeekday(3, true)).toBe('rahu');
    expect(signForWeekday(6, true)).toBe('saturday');
    expect(signForWeekday(-1)).toBe('saturday');
  });

  it('works out the sign from a birth date', () => {
    expect(signForBirthDate(2000, 1, 1)).toBe('saturday'); // 1 Jan 2000 was a Saturday
    expect(signForBirthDate(1990, 5, 16)).toBe('wednesday');
    expect(signForBirthDate(1990, 5, 16, true)).toBe('rahu');
    expect(signForBirthDate(2001, 2, 29)).toBeNull();
    expect(signForBirthDate(Number.NaN, 1, 1)).toBeNull();
    expect(signForBirthDate(1800, 1, 1)).toBeNull();
  });

  it('gives a stable daily mood that varies between days', () => {
    const sign = getSign('monday')!;
    expect(dailyMood(sign, '2026-10-15', 'en')).toBe(dailyMood(sign, '2026-10-15', 'en'));
    const days = Array.from({ length: 30 }, (_, i) => dailyMood(sign, `2026-11-${String(i + 1).padStart(2, '0')}`, 'en'));
    expect(new Set(days).size).toBeGreaterThan(2);
    const i = sign.en.moods.indexOf(dailyMood(sign, '2026-10-15', 'en'));
    expect(dailyMood(sign, '2026-10-15', 'my')).toBe(sign.my.moods[i]);
  });
});

describe('lessons', () => {
  it('has 6–8 lessons in order', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(6);
    expect(LESSONS.length).toBeLessThanOrEqual(8);
    expect(nextLesson(LESSONS[0]!.id)).toBe(LESSONS[1]);
    expect(nextLesson(LESSONS[LESSONS.length - 1]!.id)).toBeUndefined();
  });
});

describe('legal texts', () => {
  it('fills variables and hides sections whose values are not configured', () => {
    const bare = renderLegal('privacy', 'en', { appName: 'Mingalar Tarot' });
    expect(bare.sections.some((s) => s.heading === 'Contact')).toBe(false);
    expect(JSON.stringify(bare)).not.toMatch(/\{\w+\}/);
    const full = renderLegal('privacy', 'my', { appName: 'Mingalar Tarot', publisher: 'Example Co', contactEmail: 'hi@example.com' });
    expect(JSON.stringify(full)).toContain('hi@example.com');
    expect(JSON.stringify(full)).toContain('Example Co');
    expect(full.sections.length).toBe(bare.sections.length + 2);
  });
});
