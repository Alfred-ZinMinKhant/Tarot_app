import { formatDate, formatTime, localDateKey, MONTHS, timeOfDay, WEEKDAYS } from '@/utils/dates';

// Thursday, 15 October 2026, 19:05 local time
const d = new Date(2026, 9, 15, 19, 5);

describe('formatDate', () => {
  it('formats English', () => {
    expect(formatDate(d, 'en')).toBe('15 October 2026');
    expect(formatDate(d, 'en', { style: 'short' })).toBe('15 Oct 2026');
    expect(formatDate(d, 'en', { style: 'weekday-long' })).toBe('Thursday, 15 October 2026');
  });

  it('formats Burmese with Latin digits by default', () => {
    expect(formatDate(d, 'my')).toBe('2026 ခုနှစ်၊ အောက်တိုဘာ 15 ရက်');
    expect(formatDate(d, 'my', { style: 'weekday-long' })).toBe('ကြာသပတေးနေ့၊ 2026 ခုနှစ်၊ အောက်တိုဘာ 15 ရက်');
  });

  it('formats Burmese with Burmese numerals', () => {
    expect(formatDate(d, 'my', { burmeseNumerals: true })).toBe('၂၀၂၆ ခုနှစ်၊ အောက်တိုဘာ ၁၅ ရက်');
    expect(formatDate(d, 'my', { style: 'short', burmeseNumerals: true })).toBe('အောက်တိုဘာ ၁၅၊ ၂၀၂၆');
  });

  it('has the required Burmese month and weekday names', () => {
    expect(MONTHS.my).toEqual([
      'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
      'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
    ]);
    // Monday → Sunday
    const monToSun = [1, 2, 3, 4, 5, 6, 0].map((i) => WEEKDAYS.my[i]);
    expect(monToSun).toEqual(['တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ', 'တနင်္ဂနွေ']);
  });
});

describe('time helpers', () => {
  it('formats time', () => {
    expect(formatTime(d, 'en')).toBe('7:05 PM');
    expect(formatTime(d, 'my', { burmeseNumerals: true })).toBe('ည ၇:၀၅');
    expect(formatTime(new Date(2026, 0, 1, 0, 0), 'en')).toBe('12:00 AM');
  });

  it('buckets time of day', () => {
    expect(timeOfDay(new Date(2026, 0, 1, 6))).toBe('morning');
    expect(timeOfDay(new Date(2026, 0, 1, 13))).toBe('afternoon');
    expect(timeOfDay(new Date(2026, 0, 1, 18))).toBe('evening');
    expect(timeOfDay(new Date(2026, 0, 1, 23))).toBe('night');
    expect(timeOfDay(new Date(2026, 0, 1, 3))).toBe('night');
  });

  it('builds local date keys', () => {
    expect(localDateKey(d)).toBe('2026-10-15');
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
