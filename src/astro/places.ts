import cityData from '@data/cities.json';

import type { BirthData } from './birth';

type Row = [name: string, country: string, lat: number, lon: number, tz: number, ascii?: string];
const data = cityData as unknown as { timeZones: string[]; cities: Row[] };

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

let index: { row: Row; key: string }[] | null = null;
const getIndex = () => (index ??= data.cities.map((row) => ({ row, key: fold(row[5] ?? row[0]) })));

export type Place = BirthData['place'];

const toPlace = (r: Row): Place => ({
  name: r[0],
  country: r[1],
  latitude: r[2],
  longitude: r[3],
  timeZone: data.timeZones[r[4]] ?? 'UTC',
});

/** Accent-insensitive search: names that start with the query come first, then names containing it. */
export function searchPlaces(query: string, limit = 8): Place[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const exact: Row[] = [];
  const starts: Row[] = [];
  const contains: Row[] = [];
  for (const { row, key } of getIndex()) {
    if (key === q) exact.push(row);
    else if (key.startsWith(q)) starts.push(row);
    else if (key.includes(q)) contains.push(row);
  }
  return [...exact, ...starts, ...contains].slice(0, limit).map(toPlace);
}
