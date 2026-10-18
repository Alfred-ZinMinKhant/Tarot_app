import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import type { Chart } from '@/astro/chart';
import type { PlanetId } from '@/astro/ephemeris';
import { glyphText as text, PLANET_GLYPHS, SIGN_GLYPHS } from '@/astro/glyphs';
import { useAppTheme } from '@/theme/ThemeContext';

const MIN_GAP = 9; // degrees between planet glyphs

/** Spreads crowded planets apart so their glyphs don't overlap; positions only move on screen. */
function spread(items: { id: PlanetId; lon: number }[]) {
  const sorted = [...items].sort((a, b) => a.lon - b.lon);
  const out = sorted.map((p) => ({ ...p, shown: p.lon }));
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < out.length; i++) {
      const gap = out[i]!.shown - out[i - 1]!.shown;
      if (gap < MIN_GAP) {
        const push = (MIN_GAP - gap) / 2;
        out[i - 1]!.shown -= push;
        out[i]!.shown += push;
      }
    }
  }
  return out;
}

type Props = { chart: Chart; size?: number; accessibilityLabel?: string };

/**
 * The chart as a wheel: zodiac ring outside, planets inside, the Ascendant on the left when the
 * birth time is known (otherwise Aries is on the left). Purely a picture; the text below carries
 * the same information for screen readers.
 */
export function ChartWheel({ chart, size = 320, accessibilityLabel }: Props) {
  const { colors } = useAppTheme();
  const c = size / 2;
  const outer = c - 4;
  const ringInner = outer - 30;
  const planetR = ringInner - 26;
  const rot = chart.ascendant?.lon ?? 0;
  const pos = (lon: number, r: number) => {
    const a = ((180 + (lon - rot)) * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c - r * Math.sin(a) };
  };

  return (
    <Svg
      width={size}
      height={size}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Circle cx={c} cy={c} r={outer} stroke={colors.border} strokeWidth={1.5} fill="none" />
      <Circle cx={c} cy={c} r={ringInner} stroke={colors.border} strokeWidth={1} fill="none" />
      {SIGN_GLYPHS.map((g, i) => {
        const edge = pos(i * 30, outer);
        const inner = pos(i * 30, ringInner);
        const mid = pos(i * 30 + 15, (outer + ringInner) / 2);
        return (
          <G key={g}>
            <Line x1={inner.x} y1={inner.y} x2={edge.x} y2={edge.y} stroke={colors.border} strokeWidth={1} />
            <SvgText x={mid.x} y={mid.y + 5} fontSize={16} fill={colors.textMuted} textAnchor="middle">
              {text(g)}
            </SvgText>
          </G>
        );
      })}
      {chart.ascendant ? (
        <Line x1={c - planetR - 20} y1={c} x2={c + planetR + 20} y2={c} stroke={colors.accent} strokeWidth={1.5} />
      ) : null}
      {chart.midheaven ? (
        (() => {
          const mc = pos(chart.midheaven.lon, ringInner);
          return <Line x1={c} y1={c} x2={mc.x} y2={mc.y} stroke={colors.accent} strokeWidth={1} strokeDasharray="4 4" />;
        })()
      ) : null}
      {spread(chart.planets).map((p) => {
        const dot = pos(p.lon, ringInner - 3);
        const label = pos(p.shown, planetR);
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
          </G>
        );
      })}
    </Svg>
  );
}
