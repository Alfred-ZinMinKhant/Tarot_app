import type { PlanetId } from './ephemeris';

export const ASPECTS = [
  { id: 'conjunction', angle: 0, orb: 8 },
  { id: 'sextile', angle: 60, orb: 4 },
  { id: 'square', angle: 90, orb: 6 },
  { id: 'trine', angle: 120, orb: 6 },
  { id: 'opposition', angle: 180, orb: 8 },
] as const;
export type AspectId = (typeof ASPECTS)[number]['id'];

export type Aspect = { a: PlanetId; b: PlanetId; type: AspectId; orb: number };

export function findAspects(lons: Partial<Record<PlanetId, number>>): Aspect[] {
  const ids = Object.keys(lons) as PlanetId[];
  const out: Aspect[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const diff = Math.abs(lons[a]! - lons[b]!) % 360;
      const sep = diff > 180 ? 360 - diff : diff;
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb) {
          out.push({ a, b, type: asp.id, orb: Math.round(orb * 10) / 10 });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}
