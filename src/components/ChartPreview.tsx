import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BirthData } from '@/astro/birth';
import { computeChart } from '@/astro/chart';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { logError } from '@/utils/log';

import { AppText } from './AppText';
import { ChartWheel } from './ChartWheel';

/** A made-up birth (Yangon) used only to draw an example wheel before the user has entered theirs. */
const SAMPLE_BIRTH = {
  date: '1995-06-15',
  time: '14:30',
  place: { latitude: 16.8409, longitude: 96.1736, timeZone: 'Asia/Yangon' },
};

const FULL = 288;

type Props = { birth: BirthData | null; size: number };

/**
 * The chart wheel on a softly lit disc. With no birth data it draws a clearly labelled sample, so
 * nobody mistakes the example planets for their own chart.
 */
export function ChartPreview({ birth, size }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const chart = useMemo(() => {
    try {
      return computeChart(birth ?? SAMPLE_BIRTH);
    } catch (e) {
      logError('chart-preview', e);
      return null;
    }
  }, [birth]);
  if (!chart) return null;
  const sample = birth === null;
  return (
    <View style={styles.wrap} testID={sample ? 'chart-preview-sample' : 'chart-preview'}>
      <View
        style={[
          styles.disc,
          {
            width: size + 12,
            height: size + 12,
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.primary,
            opacity: sample ? 0.9 : 1,
          },
        ]}
      >
        {/* Drawn at full size and scaled down, so the glyphs stay in proportion in small thumbnails. */}
        <View style={{ width: size, height: size }}>
          <View
            style={[
              styles.full,
              {
                transform: [
                  { translateX: -(FULL - size) / 2 },
                  { translateY: -(FULL - size) / 2 },
                  { scale: size / FULL },
                ],
              },
            ]}
          >
            <ChartWheel chart={chart} size={FULL} />
          </View>
        </View>
      </View>
      {sample ? (
        <View
          style={[styles.badge, { borderColor: colors.primary, backgroundColor: colors.surface }]}
        >
          <AppText variant="caption" tone="primary" bold>
            {t('chart.sample')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { width: FULL, height: FULL },
  wrap: { alignItems: 'center' },
  disc: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
