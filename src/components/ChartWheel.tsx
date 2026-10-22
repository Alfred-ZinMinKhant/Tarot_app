import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import type { Chart } from '@/astro/chart';
import type { PlanetId } from '@/astro/ephemeris';
import { glyphText as text, PLANET_GLYPHS, SIGN_GLYPHS } from '@/astro/glyphs';
import { useAppTheme } from '@/theme/ThemeContext';

const MIN_GAP = 17; // degrees between planet glyphs

/** Spreads crowded planets apart so their glyphs don't overlap; positions only move on screen. */
function spread<T extends { id: PlanetId; lon: number }>(items: T[]) {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.lon - b.lon);
  // Start just after the widest empty arc, so a cluster straddling 0° Aries is treated as one run.
  let start = 0;
  let widest = -1;
  sorted.forEach((p, i) => {
    const next = sorted[(i + 1) % sorted.length]!;
    const gap = (next.lon - p.lon + 360) % 360 || 360;
    if (gap > widest) {
      widest = gap;
      start = (i + 1) % sorted.length;
    }
  });
  const base = sorted[start]!.lon;
  const out = sorted.map((_, i) => {
    const p = sorted[(start + i) % sorted.length]!;
    return { ...p, shown: base + ((p.lon - base + 360) % 360) };
  });
  for (let pass = 0; pass < 30; pass++) {
    for (let i = 1; i < out.length; i++) {
      const gap = out[i]!.shown - out[i - 1]!.shown;
      if (gap < MIN_GAP) {
        const push = (MIN_GAP - gap) / 2;
        out[i - 1]!.shown -= push;
        out[i]!.shown += push;
      }
    }
  }
  return out.map((p) => ({ ...p, shown: (p.shown + 360) % 360 }));
}

type Props = { chart: Chart; size?: number; accessibilityLabel?: string };

/**
 * The chart as a wheel, drawn the way Whole Sign charts usually are: zodiac ring outside, house
 * numbers inside it, planets inside that, aspect lines in the middle. With a birth time the
 * Ascendant's sign fills the first house on the left and signs run anticlockwise, so each sign is
 * one house; the exact Ascendant and Midheaven degrees are marked on their axes. Without a birth
 * time there are no houses, and Aries is on the left. Purely a picture; the text below carries the
 * same information for screen readers.
 */
export function ChartWheel({ chart, size = 320, accessibilityLabel }: Props) {
  const { colors } = useAppTheme();
  const c = size / 2;
  const outer = c - 14;
  const signInner = outer - 26;
  const houseInner = chart.ascendant ? signInner - 13 : signInner;
  const planetR = houseInner - 22;
  const aspectR = planetR - 28;
  // Whole Sign: house 1 starts at 0° of the Ascendant's sign, which sits on the left.
  const rot = chart.ascendant ? Math.floor(chart.ascendant.lon / 30) * 30 : 0;
  const pos = (lon: number, r: number) => {
    const a = ((180 + (lon - rot)) * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c - r * Math.sin(a) };
  };
  const lonOf = Object.fromEntries(chart.planets.map((p) => [p.id, p.lon])) as Record<PlanetId, number>;
  const axes = [
    chart.ascendant && { lon: chart.ascendant.lon, label: 'AC' },
    chart.midheaven && { lon: chart.midheaven.lon, label: 'MC' },
  ].filter((a): a is { lon: number; label: string } => !!a);

  return (
    <Svg
      width={size}
      height={size}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Circle cx={c} cy={c} r={outer} stroke={colors.border} strokeWidth={1.5} fill="none" />
      <Circle cx={c} cy={c} r={signInner} stroke={colors.border} strokeWidth={1} fill="none" />
      {chart.ascendant ? (
        <Circle cx={c} cy={c} r={houseInner} stroke={colors.border} strokeWidth={1} fill="none" />
      ) : null}
      <Circle cx={c} cy={c} r={aspectR} stroke={colors.border} strokeWidth={0.75} fill="none" />
      {Array.from({ length: 360 }, (_, d) => {
        const len = d % 10 === 0 ? 6 : d % 5 === 0 ? 4 : 2;
        const a = pos(rot + d, signInner);
        const b = pos(rot + d, signInner + len);
        return <Line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.border} strokeWidth={0.5} />;
      })}
      {SIGN_GLYPHS.map((g, i) => {
        // The first sign drawn is the one at the left edge; for a timed chart that is the rising sign.
        const start = rot + i * 30;
        const edge = pos(start, outer);
        const inner = pos(start, chart.ascendant ? aspectR : signInner);
        const mid = pos(start + 15, (outer + signInner) / 2);
        const num = pos(start + 15, (signInner + houseInner) / 2);
        const sign = SIGN_GLYPHS[(Math.floor(rot / 30) + i) % 12]!;
        return (
          <G key={g}>
            <Line x1={inner.x} y1={inner.y} x2={edge.x} y2={edge.y} stroke={colors.border} strokeWidth={1} />
            <SvgText x={mid.x} y={mid.y + 5} fontSize={16} fill={colors.textMuted} textAnchor="middle">
              {text(sign)}
            </SvgText>
            {chart.ascendant ? (
              <SvgText x={num.x} y={num.y + 3} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                {i + 1}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      {chart.aspects
        .filter((a) => a.type !== 'conjunction')
        .map((a) => {
          const p = pos(lonOf[a.a], aspectR);
          const q = pos(lonOf[a.b], aspectR);
          const soft = a.type === 'trine' || a.type === 'sextile';
          return (
            <Line
              key={`${a.a}-${a.b}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={soft ? colors.accent : colors.danger}
              strokeWidth={0.9}
              strokeOpacity={0.7}
            />
          );
        })}
      {axes.map((ax) => {
        const a = pos(ax.lon, outer);
        const b = pos(ax.lon, houseInner);
        const tag = pos(ax.lon, outer + 8);
        return (
          <G key={ax.label}>
            <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.accent} strokeWidth={2} />
            <SvgText x={tag.x} y={tag.y + 3} fontSize={9} fontWeight="bold" fill={colors.accent} textAnchor="middle">
              {ax.label}
            </SvgText>
          </G>
        );
      })}
      {spread(chart.planets).map((p) => {
        const dot = pos(p.lon, houseInner - 3);
        const label = pos(p.shown, planetR);
        const flag = pos(p.shown, planetR - 15);
        const big = p.id === 'sun' || p.id === 'moon';
        return (
          <G key={p.id}>
            <Circle cx={dot.x} cy={dot.y} r={2.5} fill={colors.primary} />
            <SvgText
              x={label.x}
              y={label.y + 6}
              fontSize={big ? 20 : 17}
              fill={big ? colors.primary : colors.text}
              textAnchor="middle"
            >
              {text(PLANET_GLYPHS[p.id])}
            </SvgText>
            <SvgText x={flag.x} y={flag.y + 3} fontSize={8} fill={colors.textMuted} textAnchor="middle">
              {`${p.degree}°${p.retrograde && p.id !== 'node' ? 'r' : ''}`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
