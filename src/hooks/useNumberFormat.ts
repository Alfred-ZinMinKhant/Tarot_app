import { useCallback } from 'react';

import { useSettings } from '@/store/settings';
import { formatNumber, type NumberFormatOptions } from '@/utils/numbers';

/** `formatNumber` bound to the user's "Use Burmese numerals" setting. */
export function useNumberFormat() {
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  return useCallback(
    (value: number, options: Omit<NumberFormatOptions, 'burmeseNumerals'> = {}) =>
      formatNumber(value, { ...options, burmeseNumerals }),
    [burmeseNumerals],
  );
}
