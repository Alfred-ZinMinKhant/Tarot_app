import * as Astronomy from 'astronomy-engine';

export const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'node',
] as const;
export type PlanetId = (typeof PLANETS)[number];

const BODY: Record<Exclude<PlanetId, 'node'>, Astronomy.Body> = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto,
};

export const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Tropical ecliptic longitude of date, in degrees [0, 360). */
export function longitude(id: PlanetId, date: Date): number {
  const time = Astronomy.MakeTime(date);
  if (id === 'node') {
    const t = time.tt / 36525; // Julian centuries since J2000 (tt is days since J2000)
    return norm360(125.04452 - 1934.136261 * t); // mean lunar north node
  }
  if (id === 'sun') return norm360(Astronomy.SunPosition(time).elon);
  if (id === 'moon') return norm360(Astronomy.EclipticGeoMoon(time).lon);
  const eqj = Astronomy.GeoVector(BODY[id], time, true);
  const ect = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), eqj);
  return norm360(Astronomy.SphereFromVector(ect).lon);
}

/** True when the body appears to move backwards against the zodiac (the Sun and Moon never do). */
export function isRetrograde(id: PlanetId, date: Date): boolean {
  if (id === 'sun' || id === 'moon') return false;
  if (id === 'node') return true; // the mean node always regresses
  const day = 86_400_000;
  const before = longitude(id, new Date(date.getTime() - day));
  const after = longitude(id, new Date(date.getTime() + day));
  const delta = ((after - before + 540) % 360) - 180;
  return delta < 0;
}

/** Greenwich apparent sidereal time in degrees. */
export function greenwichSiderealDeg(date: Date): number {
  return norm360(Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15);
}

/** Mean obliquity of the ecliptic in degrees. */
export function obliquityDeg(date: Date): number {
  const t = Astronomy.MakeTime(date).tt / 36525;
  return 23.4392911 - 0.0130042 * t;
}
