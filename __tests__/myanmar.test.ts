import { breakBurmese, burmeseSyllables, containsMyanmar, stripZwsp, ZWSP } from '@/utils/myanmar';

describe('breakBurmese', () => {
  it('leaves Latin text untouched', () => {
    expect(breakBurmese('The Fool')).toBe('The Fool');
  });

  it('splits simple syllables', () => {
    expect(burmeseSyllables('မြန်မာ')).toEqual(['မြန်', 'မာ']);
    expect(burmeseSyllables('ကတ်များ')).toEqual(['ကတ်', 'များ']);
  });

  it('keeps stacked consonants (္) with their syllable', () => {
    // ဗုဒ္ဓဟူး = ဗုဒ်/ဓ stacked + ဟူး
    expect(burmeseSyllables('ဗုဒ္ဓဟူး')).toEqual(['ဗုဒ္ဓ', 'ဟူး']);
    expect(burmeseSyllables('ကမ္ဘာ')).toEqual(['ကမ္ဘာ']);
  });

  it('keeps kinzi (င်္) attached', () => {
    expect(burmeseSyllables('တနင်္လာ')).toEqual(['တ', 'နင်္လာ']);
    expect(burmeseSyllables('အင်္ဂါ')).toEqual(['အင်္ဂါ']);
  });

  it('handles dot-below before asat (့်)', () => {
    expect(burmeseSyllables('သင့်')).toEqual(['သင့်']);
    expect(burmeseSyllables('ကိုယ့်')).toEqual(['ကိုယ့်']);
  });

  it('treats independent vowels as syllable starts', () => {
    expect(burmeseSyllables('ဧပြီ')).toEqual(['ဧ', 'ပြီ']);
    expect(burmeseSyllables('ဩဂုတ်')).toEqual(['ဩ', 'ဂုတ်']);
  });

  it('does not break after punctuation, spaces or inside numbers', () => {
    const out = breakBurmese('မင်္ဂလာပါ။ ၂၀၂၆ ခုနှစ်');
    expect(out).not.toContain(`။${ZWSP}`);
    expect(out).toContain('၂၀၂၆');
    expect(out).not.toMatch(new RegExp(`${ZWSP} `));
  });

  it('is idempotent and reversible', () => {
    const s = 'ဒီနေ့ဟာ ကိုယ့်နှလုံးသားရဲ့ စကားကို နားထောင်ဖို့ ကောင်းတဲ့နေ့ပါ။';
    const once = breakBurmese(s);
    expect(breakBurmese(once)).toBe(once);
    expect(stripZwsp(once)).toBe(s);
  });

  it('gives every syllable a base consonant or vowel (no orphaned marks)', () => {
    const sample = 'ကြာသပတေး သောကြာ တနင်္ဂနွေ စက်တင်ဘာ အောက်တိုဘာ နိုဝင်ဘာ ဖေဖော်ဝါရီ ဇူလိုင် သိက္ခာ';
    for (const syl of burmeseSyllables(sample.replace(/ /g, ''))) {
      const first = syl.codePointAt(0)!;
      const isBase = (first >= 0x1000 && first <= 0x102a) || first === 0x103f;
      expect(isBase).toBe(true);
    }
  });
});

describe('containsMyanmar', () => {
  it('detects Burmese characters', () => {
    expect(containsMyanmar('Tarot')).toBe(false);
    expect(containsMyanmar('Tarot တားရော့')).toBe(true);
  });
});
