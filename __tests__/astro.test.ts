import { computeChart } from '@/astro/chart';
import { localToUtc } from '@/astro/time';

const yangon = { latitude: 16.8409, longitude: 96.1735, timeZone: 'Asia/Yangon' };
const london = { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' };
const sydney = { latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' };
const get = (c: ReturnType<typeof computeChart>, id: string) => c.planets.find((p) => p.id === id)!;

describe('localToUtc', () => {
  it('converts a fixed offset zone', () => {
    expect(localToUtc('2000-01-01', '12:00', 'Asia/Yangon').toISOString()).toBe('2000-01-01T05:30:00.000Z');
  });
  it('honours daylight saving', () => {
    expect(localToUtc('2000-07-01', '12:00', 'Europe/London').toISOString()).toBe('2000-07-01T11:00:00.000Z');
    expect(localToUtc('2000-01-01', '12:00', 'Europe/London').toISOString()).toBe('2000-01-01T12:00:00.000Z');
  });
});

describe('computeChart', () => {
  // 2000-01-01 12:00 UTC: Sun ~10°22' Capricorn, Moon ~ 14° Scorpio.
  it('puts the Sun and Moon where published ephemerides do', () => {
    const c = computeChart({ date: '2000-01-01', time: '12:00', place: london });
    expect(get(c, 'sun').sign).toBe('capricorn');
    expect(get(c, 'sun').degree).toBe(10);
    expect(get(c, 'moon').sign).toBe('scorpio');
    expect(get(c, 'moon').degree).toBeGreaterThanOrEqual(13);
    expect(get(c, 'moon').degree).toBeLessThanOrEqual(15);
    expect(get(c, 'saturn').sign).toBe('taurus');
    expect(get(c, 'jupiter').sign).toBe('aries');
  });

  it('puts the Ascendant near the Sun at sunrise and opposite it at sunset', () => {
    const sunrise = computeChart({ date: '2000-03-21', time: '06:00', place: london });
    const diff = Math.abs(sunrise.ascendant!.lon - get(sunrise, 'sun').lon);
    expect(Math.min(diff, 360 - diff)).toBeLessThan(20);
    const sunset = computeChart({ date: '2000-03-21', time: '18:00', place: london });
    const opp = Math.abs(sunset.ascendant!.lon - get(sunset, 'sun').lon);
    expect(Math.abs(opp - 180)).toBeLessThan(20);
  });

  it('never marks the Sun retrograde and always marks the mean node', () => {
    const c = computeChart({ date: '2000-01-01', time: '12:00', place: london });
    expect(get(c, 'sun').retrograde).toBe(false);
    expect(get(c, 'node').retrograde).toBe(true);
  });

  it('works in the southern hemisphere and in Myanmar', () => {
    const s = computeChart({ date: '1990-12-25', time: '09:30', place: sydney });
    expect(s.ascendant).not.toBeNull();
    const y = computeChart({ date: '1995-05-05', time: '04:15', place: yangon });
    expect(get(y, 'sun').sign).toBe('taurus');
  });

  it('without a birth time skips houses and the Ascendant', () => {
    const c = computeChart({ date: '2000-01-01', time: null, place: london });
    expect(c.timeKnown).toBe(false);
    expect(c.ascendant).toBeNull();
    expect(c.planets.every((p) => p.house === null)).toBe(true);
  });

  it('flags a Moon sign change on an unknown-time day', () => {
    // The Moon moves ~13°/day, so within a few days one of these dates must straddle a boundary.
    const days = ['2000-01-01', '2000-01-02', '2000-01-03', '2000-01-04', '2000-01-05'];
    const flagged = days.filter((d) => computeChart({ date: d, time: null, place: london }).moonSignAmbiguous);
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('does not break near the pole', () => {
    const c = computeChart({ date: '2000-06-21', time: '12:00', place: { latitude: 78.2, longitude: 15.6, timeZone: 'Arctic/Longyearbyen' } });
    expect(Number.isFinite(c.ascendant!.lon)).toBe(true);
  });
});

describe('birth data validation', () => {
  const good = {
    date: '1995-05-05',
    time: '04:15',
    place: { name: 'Yangon', country: 'MM', latitude: 16.8, longitude: 96.2, timeZone: 'Asia/Yangon' },
  };

  it('keeps a well-formed value and drops bad ones', () => {
    const { sanitizeBirth } = jest.requireActual('@/astro/birth');
    expect(sanitizeBirth(good)).toEqual(good);
    expect(sanitizeBirth({ ...good, time: null })).toEqual({ ...good, time: null });
    expect(sanitizeBirth({ ...good, date: '1995-02-30' })).toBeNull();
    expect(sanitizeBirth({ ...good, date: '1800-01-01' })).toBeNull();
    expect(sanitizeBirth({ ...good, time: '25:00' })).toBeNull();
    expect(sanitizeBirth({ ...good, place: { ...good.place, latitude: 99 } })).toBeNull();
    expect(sanitizeBirth({ ...good, place: { ...good.place, timeZone: 'Mars/Base' } })).toBeNull();
    expect(sanitizeBirth('nope')).toBeNull();
  });

  it('is accepted by settings sync only when valid', () => {
    const { sanitizeSettings } = jest.requireActual('@/sync/settingsData');
    expect(sanitizeSettings({ birth: good }).birth).toEqual(good);
    expect(sanitizeSettings({ birth: { ...good, date: 'x' } }).birth).toBeUndefined();
    expect(sanitizeSettings({ birth: null }).birth).toBeNull();
  });
});

describe('place search', () => {
  it('finds cities ignoring case and accents, with a usable time zone', () => {
    const { searchPlaces } = jest.requireActual('@/astro/places');
    const [y] = searchPlaces('Yangon');
    expect(y).toMatchObject({ name: 'Yangon', country: 'MM', timeZone: 'Asia/Yangon' });
    expect(searchPlaces('sao paulo')[0]?.country).toBe('BR');
    expect(searchPlaces('x')).toEqual([]);
    expect(searchPlaces('zzzzqq')).toEqual([]);
  });
});

describe('readings and tarot links', () => {
  it('writes a reading in both languages with no placeholders left over', () => {
    const { bigThreeReading, planetName } = jest.requireActual('@/astro/readings');
    for (const lang of ['en', 'my']) {
      for (const kind of ['sun', 'moon', 'rising']) {
        const text = bigThreeReading(kind, 'leo', lang);
        expect(text).not.toMatch(/[{}]/);
        expect(text.length).toBeGreaterThan(30);
      }
    }
    expect(planetName('node', 'my')).toBe('ရာဟု');
    expect(planetName('sun', 'en')).toBe('Sun');
  });

  it('links every zodiac sign and planet except the node to a major arcana card', () => {
    const { cardForSign, cardForPlanet } = jest.requireActual('@/astro/astroCards');
    const { SIGNS } = jest.requireActual('@/astro/chart');
    const { PLANETS } = jest.requireActual('@/astro/ephemeris');
    for (const s of SIGNS) expect(cardForSign(s)).toMatch(/^major-/);
    for (const p of PLANETS.filter((x: string) => x !== 'node')) expect(cardForPlanet(p)).toMatch(/^major-/);
    expect(cardForPlanet('node')).toBeUndefined();
    expect(cardForSign('aquarius')).toBe('major-17-star');
    expect(cardForPlanet('sun')).toBe('major-19-sun');
  });
});
