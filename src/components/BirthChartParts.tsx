import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Chart, Placement } from '@/astro/chart';
import type { PlanetId } from '@/astro/ephemeris';
import { glyphText, PLANET_GLYPHS, RISING_GLYPH, signGlyph } from '@/astro/glyphs';
import { planetMeaning, planetName, zodiacName } from '@/astro/readings';
import type { Language } from '@/i18n/languages';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { Card } from './Card';
import { ChartWheel } from './ChartWheel';

/** A gold-ringed disc holding one astrological glyph. */
export function GlyphDisc({ glyph, size = 48 }: { glyph: string; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
      ]}
    >
      <AppText style={{ fontSize: size * 0.5, lineHeight: size * 0.7, color: colors.primary }} noBreak center>
        {glyphText(glyph)}
      </AppText>
    </View>
  );
}

/** The wheel on a soft disc, with the big three as quick-glance pills beneath it. */
export function ChartHero({
  chart,
  lang,
  summary,
  wheelLabel,
  note,
}: {
  chart: Chart;
  lang: Language;
  summary: string;
  wheelLabel: string;
  note?: string;
}) {
  const { colors } = useAppTheme();
  const sun = chart.planets.find((p) => p.id === 'sun')!;
  const moon = chart.planets.find((p) => p.id === 'moon')!;
  const glance: { key: string; glyph: string; sign: Placement['sign'] }[] = [
    { key: 'sun', glyph: PLANET_GLYPHS.sun, sign: sun.sign },
    { key: 'moon', glyph: PLANET_GLYPHS.moon, sign: moon.sign },
    ...(chart.ascendant ? [{ key: 'rising', glyph: RISING_GLYPH, sign: chart.ascendant.sign }] : []),
  ];
  return (
    <Card testID="chart-result" style={styles.hero}>
      <View style={[styles.wheelDisc, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <ChartWheel chart={chart} size={288} accessibilityLabel={wheelLabel} />
      </View>
      <AppText variant="caption" tone="textMuted" center>
        {summary}
      </AppText>
      <View style={styles.glance}>
        {glance.map((g) => (
          <View key={g.key} style={[styles.pill, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
            <AppText variant="label" tone="primary">
              {glyphText(g.glyph)}
            </AppText>
            <AppText variant="label" bold>
              {zodiacName(g.sign, lang)}
            </AppText>
          </View>
        ))}
      </View>
      {note ? (
        <AppText variant="caption" tone="textMuted" center>
          {note}
        </AppText>
      ) : null}
    </Card>
  );
}

/** One of Sun / Moon / Rising: big glyph, sign name, and the short reading. */
export function BigThreeCard({
  kind,
  label,
  sign,
  lang,
  reading,
  footnote,
  testID,
}: {
  kind: 'sun' | 'moon' | 'rising';
  label: string;
  sign: Placement['sign'];
  lang: Language;
  reading: string;
  footnote?: string;
  testID: string;
}) {
  const glyph = kind === 'rising' ? RISING_GLYPH : PLANET_GLYPHS[kind];
  return (
    <Card testID={testID} style={styles.bigRow}>
      <GlyphDisc glyph={glyph} size={56} />
      <View style={styles.bigText}>
        <AppText variant="caption" tone="accent" bold>
          {label.toUpperCase()}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {`${zodiacName(sign, lang)} ${signGlyph(sign)}`}
        </AppText>
        <AppText>{reading}</AppText>
        {footnote ? (
          <AppText variant="caption" tone="textMuted">
            {footnote}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

/** One planet: glyph, name and meaning on the left; sign, degree and house tags on the right. */
export function PlacementRow({
  planet,
  lang,
  degree,
  houseLabel,
  retrogradeLabel,
  cardLink,
  last,
}: {
  planet: Placement;
  lang: Language;
  degree: string;
  houseLabel?: string;
  retrogradeLabel?: string;
  cardLink?: ReactNode;
  last?: boolean;
}) {
  const { colors } = useAppTheme();
  const id: PlanetId = planet.id;
  return (
    <View
      testID={`chart-planet-${id}`}
      style={[styles.placement, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <GlyphDisc glyph={PLANET_GLYPHS[id]} size={40} />
      <View style={styles.placementText}>
        <AppText bold>{planetName(id, lang)}</AppText>
        <AppText variant="caption" tone="textMuted">
          {planetMeaning(id, lang)}
        </AppText>
        {cardLink}
      </View>
      <View style={styles.placementTags}>
        <AppText variant="label" bold>
          {`${signGlyph(planet.sign)} ${zodiacName(planet.sign, lang)}`}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {degree}
        </AppText>
        <View style={styles.tagRow}>
          {houseLabel ? <Tag label={houseLabel} /> : null}
          {retrogradeLabel && planet.retrograde && id !== 'node' ? <Tag label={`℞ ${retrogradeLabel}`} /> : null}
        </View>
      </View>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <AppText variant="caption" tone="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: spacing.md },
  wheelDisc: { borderRadius: radius.pill, borderWidth: 1, padding: spacing.sm },
  glance: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bigRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  bigText: { flex: 1, gap: spacing.xs },
  placement: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  placementText: { flex: 1, gap: 2 },
  placementTags: { alignItems: 'flex-end', gap: 2, maxWidth: '40%' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.xs },
  tag: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 1 },
});
