import readings from '@data/chart-readings.json';

import type { Language } from '@/i18n/languages';
import { ZODIAC_LABELS, PLANET_LABELS } from '@/data/deck';

import type { Placement, ZodiacId } from './chart';
import type { PlanetId } from './ephemeris';

type L10n = Record<Language, string>;
type Data = {
  frames: Record<'sun' | 'moon' | 'rising', L10n>;
  signs: Record<ZodiacId, Record<'core' | 'feel' | 'first', L10n>>;
  planets: Record<PlanetId, L10n>;
};
const data = readings as unknown as Data;

export const zodiacName = (sign: ZodiacId, lang: Language) => ZODIAC_LABELS[sign][lang];

/** The lunar node is Rahu in Burmese astrology. */
export const planetName = (id: PlanetId, lang: Language): string =>
  id === 'node'
    ? lang === 'my'
      ? 'ရာဟု'
      : 'North Node'
    : (PLANET_LABELS[id].en === 'the Sun' || PLANET_LABELS[id].en === 'the Moon'
        ? { en: PLANET_LABELS[id].en.slice(4), my: PLANET_LABELS[id].my }
        : PLANET_LABELS[id])[lang];

/** One short, playful reading for the big three. */
export function bigThreeReading(kind: 'sun' | 'moon' | 'rising', sign: ZodiacId, lang: Language): string {
  const part = kind === 'sun' ? 'core' : kind === 'moon' ? 'feel' : 'first';
  return data.frames[kind][lang]
    .replace('{sign}', zodiacName(sign, lang))
    .replace('{x}', data.signs[sign][part][lang]);
}

/** What a planet stands for, as a short phrase ("how you think and talk"). */
export const planetMeaning = (id: PlanetId, lang: Language) => data.planets[id][lang];

export const placementLine = (p: Placement, lang: Language) =>
  `${planetName(p.id, lang)} · ${zodiacName(p.sign, lang)}`;
