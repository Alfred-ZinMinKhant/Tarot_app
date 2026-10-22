import { computeChart } from '@/astro/chart';
import type { PlanetId } from '@/astro/ephemeris';

// Published chart data (Astrotheme; Einstein's node from Astro.com) as degrees + minutes within a sign.
const SIGN_ORDER = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
const lon = (sign: string, deg: number, min: number) => SIGN_ORDER.indexOf(sign) * 30 + deg + min / 60;

// Our values are rounded differently and use slightly different city coordinates, so allow 2'.
const TOLERANCE = 2 / 60;

type Ref = {
  name: string;
  date: string;
  time: string | null;
  place: { latitude: number; longitude: number; timeZone: string };
  planets: Partial<Record<PlanetId, number>>;
  ascendant?: number;
  midheaven?: number;
};

const REFS: Ref[] = [
  {
    name: 'Einstein, Ulm 1879 (UT)',
    date: '1879-03-14',
    time: '10:50',
    place: { latitude: 48 + 24 / 60, longitude: 10, timeZone: 'UTC' },
    planets: { node: lon('Aqu', 1, 28) },
  },
  {
    name: 'Yangon 1999',
    date: '1999-03-24',
    time: '08:46',
    place: { latitude: 16.8409, longitude: 96.1735, timeZone: 'Asia/Yangon' },
    planets: { sun: lon('Ari', 3, 0), moon: lon('Gem', 28, 40) },
    ascendant: lon('Tau', 19, 13),
  },
  {
    name: 'Obama, Honolulu 1961',
    date: '1961-08-04',
    time: '19:24',
    place: { latitude: 21.3069, longitude: -157.8583, timeZone: 'Pacific/Honolulu' },
    planets: { sun: lon('Leo', 12, 33), moon: lon('Gem', 3, 21) },
    ascendant: lon('Aqu', 18, 3),
    midheaven: lon('Sco', 28, 53),
  },
  {
    name: 'Swift, Pennsylvania 1989',
    date: '1989-12-13',
    time: '08:36',
    place: { latitude: 40.3356, longitude: -75.9269, timeZone: 'America/New_York' },
    planets: { sun: lon('Sag', 21, 32), moon: lon('Can', 3, 30) },
    ascendant: lon('Cap', 8, 14),
    midheaven: lon('Sco', 2, 28),
  },
  {
    name: 'Mandela, South Africa 1918 (southern hemisphere)',
    date: '1918-07-18',
    time: '14:54',
    place: { latitude: -31.95, longitude: 28.5, timeZone: 'Africa/Johannesburg' },
    planets: { sun: lon('Can', 25, 4), moon: lon('Sco', 20, 15) },
    ascendant: lon('Sag', 23, 41),
    midheaven: lon('Vir', 5, 44),
  },
  {
    name: 'Aung San Suu Kyi, Yangon 1945 (wartime clock)',
    date: '1945-06-19',
    time: '12:00',
    place: { latitude: 16.8409, longitude: 96.1735, timeZone: 'Asia/Yangon' },
    planets: { sun: lon('Gem', 27, 34), moon: lon('Lib', 15, 36) },
    ascendant: lon('Vir', 25, 54),
    midheaven: lon('Gem', 26, 6),
  },
  {
    name: 'Shakira, Colombia 1977',
    date: '1977-02-02',
    time: '09:30',
    place: { latitude: 10.9639, longitude: -74.7964, timeZone: 'America/Bogota' },
    planets: { sun: lon('Aqu', 13, 39), moon: lon('Can', 24, 46) },
    ascendant: lon('Ari', 6, 23),
    midheaven: lon('Cap', 4, 56),
  },
  {
    name: 'Jackman, Sydney 1968 (no birth time, noon chart)',
    date: '1968-10-12',
    time: null,
    place: { latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
    planets: { sun: lon('Lib', 18, 48), moon: lon('Gem', 20, 55) },
  },
];

/** Smallest angle between two longitudes, in degrees. */
const diff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe.each(REFS)('reference chart: $name', (ref) => {
  const chart = computeChart({ date: ref.date, time: ref.time, place: ref.place });

  it.each(Object.entries(ref.planets) as [PlanetId, number][])('places %s within 2 arcminutes', (id, expected) => {
    const got = chart.planets.find((p) => p.id === id)!.lon;
    expect(diff(got, expected)).toBeLessThanOrEqual(TOLERANCE);
  });

  if (ref.ascendant !== undefined) {
    it('places the Ascendant within 2 arcminutes', () => {
      expect(diff(chart.ascendant!.lon, ref.ascendant!)).toBeLessThanOrEqual(TOLERANCE);
    });
  }
  if (ref.midheaven !== undefined) {
    it('places the Midheaven within 2 arcminutes', () => {
      expect(diff(chart.midheaven!.lon, ref.midheaven!)).toBeLessThanOrEqual(TOLERANCE);
    });
  }
  if (ref.time === null) {
    it('has no Ascendant or houses without a birth time', () => {
      expect(chart.ascendant).toBeNull();
      expect(chart.planets.every((p) => p.house === null)).toBe(true);
    });
  }
});
