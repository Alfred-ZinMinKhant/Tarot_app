import { formatNumber, toBurmeseDigits, toLatinDigits } from '@/utils/numbers';

describe('formatNumber', () => {
  it('defaults to Latin digits with grouping', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(78)).toBe('78');
  });

  it('supports Burmese numerals', () => {
    expect(formatNumber(1909, { burmeseNumerals: true, grouping: false })).toBe('၁၉၀၉');
    expect(formatNumber(1234, { burmeseNumerals: true })).toBe('၁,၂၃၄');
    expect(formatNumber(0, { burmeseNumerals: true })).toBe('၀');
  });

  it('handles negatives, decimals and padding', () => {
    expect(formatNumber(-12.5)).toBe('-12.5');
    expect(formatNumber(5, { minimumIntegerDigits: 2 })).toBe('05');
  });

  it('round-trips digits', () => {
    expect(toLatinDigits(toBurmeseDigits('0123456789'))).toBe('0123456789');
    expect(toBurmeseDigits('0123456789')).toBe('၀၁၂၃၄၅၆၇၈၉');
  });
});
