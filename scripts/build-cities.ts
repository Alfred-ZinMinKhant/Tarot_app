/**
 * Builds data/cities.json from GeoNames "cities15000" (CC BY 4.0, https://www.geonames.org).
 * Usage: npx tsx scripts/build-cities.ts path/to/cities15000.txt
 * Keeps cities of 150,000+ people worldwide, plus every Myanmar entry in the file.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MIN_POP = 150_000;
const input = process.argv[2];
if (!input) throw new Error('Pass the path to cities15000.txt');

const timeZones: string[] = [];
const rows: [string, string, number, number, number, string][] = [];
for (const line of readFileSync(input, 'utf8').split('\n')) {
  const c = line.split('\t');
  if (c.length < 18) continue;
  const [name, ascii, lat, lon, country, pop, tz] = [c[1]!, c[2]!, Number(c[4]), Number(c[5]), c[8]!, Number(c[14]), c[17]!];
  if (pop < MIN_POP && country !== 'MM') continue;
  let tzi = timeZones.indexOf(tz);
  if (tzi < 0) tzi = timeZones.push(tz) - 1;
  rows.push([name, country, Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, tzi, ascii]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
// Compact: [name, country, lat, lon, tzIndex, asciiName?] — asciiName only when it differs from name.
const cities = rows.map(([n, cc, la, lo, tz, ascii]) => (ascii === n ? [n, cc, la, lo, tz] : [n, cc, la, lo, tz, ascii]));
writeFileSync('data/cities.json', JSON.stringify({ source: 'GeoNames (CC BY 4.0)', timeZones, cities }));
console.log(`${cities.length} cities, ${timeZones.length} time zones`);
