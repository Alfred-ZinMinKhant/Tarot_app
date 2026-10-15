import { findAspects, type Aspect } from './aspects';
import { isRetrograde, longitude, PLANETS, type PlanetId } from './ephemeris';
import { angles, signIndex, wholeSignHouse } from './houses';
import { localToUtc } from './time';

export const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;
export type ZodiacId = (typeof SIGNS)[number];

export type BirthPlace = { latitude: number; longitude: number; timeZone: string };
export type BirthInput = { date: string; time: string | null; place: BirthPlace };

export type Placement = {
  id: PlanetId;
  lon: number;
  sign: ZodiacId;
  degree: number;
  retrograde: boolean;
  house: number | null;
};

export type Chart = {
  utc: Date;
  timeKnown: boolean;
  planets: Placement[];
  ascendant: { lon: number; sign: ZodiacId; degree: number } | null;
  midheaven: { lon: number; sign: ZodiacId; degree: number } | null;
  aspects: Aspect[];
  elements: Record<'fire' | 'earth' | 'air' | 'water', number>;
  /** Set when the Moon changes sign during the (unknown-time) birth day. */
  moonSignAmbiguous: [ZodiacId, ZodiacId] | null;
};

const ELEMENT = ['fire', 'earth', 'air', 'water'] as const;
const at = (lon: number) => ({ lon, sign: SIGNS[signIndex(lon)]!, degree: Math.floor(lon % 30) });

export function computeChart(input: BirthInput): Chart {
  const timeKnown = input.time !== null;
  // Without a birth time, calculate for local noon — the least wrong guess for the slow planets.
  const utc = localToUtc(input.date, input.time ?? '12:00', input.place.timeZone);
  const asc = timeKnown ? angles(utc, input.place.latitude, input.place.longitude) : null;

  const planets: Placement[] = PLANETS.map((id) => {
    const lon = longitude(id, utc);
    return {
      id,
      ...at(lon),
      retrograde: isRetrograde(id, utc),
      house: asc ? wholeSignHouse(lon, asc.ascendant) : null,
    };
  });

  const aspects = findAspects(Object.fromEntries(planets.map((p) => [p.id, p.lon])));
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of planets) if (p.id !== 'node') elements[ELEMENT[signIndex(p.lon) % 4]!] += 1;

  let moonSignAmbiguous: [ZodiacId, ZodiacId] | null = null;
  if (!timeKnown) {
    const start = localToUtc(input.date, '00:00', input.place.timeZone);
    const end = localToUtc(input.date, '23:59', input.place.timeZone);
    const a = signIndex(longitude('moon', start));
    const b = signIndex(longitude('moon', end));
    if (a !== b) moonSignAmbiguous = [SIGNS[a]!, SIGNS[b]!];
  }

  return {
    utc,
    timeKnown,
    planets,
    ascendant: asc ? at(asc.ascendant) : null,
    midheaven: asc ? at(asc.midheaven) : null,
    aspects,
    elements,
    moonSignAmbiguous,
  };
}
