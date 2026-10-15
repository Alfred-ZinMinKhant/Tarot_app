/**
 * Local civil time at a place → a real UTC instant, using the IANA zone's historical rules.
 * `Intl.DateTimeFormat` is used only to read the numeric offset (no locale-specific text), so it is
 * safe even where Hermes lacks Burmese locale data.
 */

function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

/** `date` is YYYY-MM-DD, `time` is HH:mm. Throws if the zone is unknown to the runtime. */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle on the right offset even right next to a clock change.
  let utc = naive - offsetMinutes(naive, timeZone) * 60_000;
  utc = naive - offsetMinutes(utc, timeZone) * 60_000;
  return new Date(utc);
}
