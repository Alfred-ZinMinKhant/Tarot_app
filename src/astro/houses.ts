import { greenwichSiderealDeg, norm360, obliquityDeg } from './ephemeris';

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type Angles = { ascendant: number; midheaven: number };

/** Ascendant and Midheaven (tropical longitudes) for a UTC instant and a place. */
export function angles(date: Date, latitude: number, longitudeEast: number): Angles {
  const ramc = rad(norm360(greenwichSiderealDeg(date) + longitudeEast));
  const eps = rad(obliquityDeg(date));
  const phi = rad(Math.max(-89.9, Math.min(89.9, latitude)));
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
  const mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps));
  return { ascendant: norm360(deg(asc)), midheaven: norm360(deg(mc)) };
}

export const signIndex = (lon: number) => Math.floor(norm360(lon) / 30);

/** Whole Sign houses: house 1 is the sign of the Ascendant. Works at every latitude. */
export function wholeSignHouse(lon: number, ascendant: number): number {
  return ((signIndex(lon) - signIndex(ascendant) + 12) % 12) + 1;
}
