import { DECK, ZODIAC_LABELS, PLANET_LABELS } from '@/data/deck';

import type { ZodiacId } from './chart';
import type { PlanetId } from './ephemeris';

/** Major arcana ids by Golden Dawn attribution, derived from the deck so the two never drift apart. */
const byLabel = new Map(DECK.filter((c) => c.arcana === 'major').map((c) => [c.astrology.en, c.id]));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const cardForSign = (sign: ZodiacId): string | undefined => byLabel.get(ZODIAC_LABELS[sign].en);

export const cardForPlanet = (id: PlanetId): string | undefined =>
  id === 'node' ? undefined : byLabel.get(cap(PLANET_LABELS[id].en));
