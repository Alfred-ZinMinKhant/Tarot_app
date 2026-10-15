import { DECK_IDS, type DrawnCard } from './draw';
import { hashString, seededRandom } from './random';

/**
 * The Card of the Day: deterministic for a given person (their private random seed, created once
 * on this device) and calendar date, so reopening the app the same day shows the same card.
 */
export function dailyCard(seed: string, dateKey: string, { reversals = true } = {}): DrawnCard {
  const rand = seededRandom(hashString(`${seed}|${dateKey}`));
  const cardId = DECK_IDS[rand(DECK_IDS.length)]!;
  return { cardId, reversed: reversals ? rand(2) === 1 : false };
}
