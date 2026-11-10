import type { Element } from '@/data/types';
import { getCard } from '@/data/cards';

import { cardForSign } from './astroCards';
import { type Chart, SIGNS, type ZodiacId } from './chart';

export type DailyLink =
  | { kind: 'sun' | 'moon' | 'rising'; sign: ZodiacId }
  | { kind: 'elementSun'; sign: ZodiacId; element: Element }
  | { kind: 'elementDominant'; element: Element };

/** Signs run fire, earth, air, water, repeating. */
const ELEMENTS: readonly Element[] = ['fire', 'earth', 'air', 'water'];
export const signElement = (sign: ZodiacId): Element => ELEMENTS[SIGNS.indexOf(sign) % 4]!;

/**
 * How today's card connects to the person's birth chart, or null when it does not. In order of
 * strength: the card is the Golden Dawn card of their Sun, Moon or rising sign; the card's element
 * is their Sun sign's; or it is the element their chart holds most of. Nothing is invented: if none
 * of these hold, no note is shown.
 */
export function dailyAstroLink(cardId: string, chart: Chart): DailyLink | null {
  const card = getCard(cardId);
  if (!card) return null;
  const sun = chart.planets.find((p) => p.id === 'sun')?.sign;
  const moon = chart.planets.find((p) => p.id === 'moon')?.sign;
  if (sun && cardForSign(sun) === cardId) return { kind: 'sun', sign: sun };
  if (moon && !chart.moonSignAmbiguous && cardForSign(moon) === cardId) return { kind: 'moon', sign: moon };
  if (chart.ascendant && cardForSign(chart.ascendant.sign) === cardId) return { kind: 'rising', sign: chart.ascendant.sign };
  if (sun && signElement(sun) === card.element) return { kind: 'elementSun', sign: sun, element: card.element };
  const ranked = (Object.entries(chart.elements) as [Element, number][]).sort((a, b) => b[1] - a[1]);
  const [top, next] = ranked;
  if (top && top[0] === card.element && top[1] > (next?.[1] ?? 0)) return { kind: 'elementDominant', element: card.element };
  return null;
}
