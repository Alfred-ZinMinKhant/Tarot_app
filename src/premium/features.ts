import { pad2 } from '@/utils/dates';

/** What Premium unlocks. Everything else (daily card, one- and three-card spreads, journal,
 * library, lessons, signs, data export) is free forever. */
export const PREMIUM_SPREADS: readonly string[] = ['love', 'celtic-cross'];

/** Free plan: this many reading images can be shared per calendar month. */
export const FREE_SHARES_PER_MONTH = 3;

export const isPremiumSpread = (spreadId: string): boolean => PREMIUM_SPREADS.includes(spreadId);

/** "YYYY-MM" in local time, the period the free share allowance resets on. */
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}
