import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Header, Icon, Screen } from '@/components';
import { LESSONS } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useSettings } from '@/store/settings';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

export default function Learn() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const { colors } = useAppTheme();
  const read = useSettings((s) => s.lessonsRead);
  const done = LESSONS.filter((l) => read.includes(l.id)).length;

  return (
    <Screen testID="screen-learn" ad>
      <Header title={t('learn.title')} subtitle={t('learn.subtitle')} />
      <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: LESSONS.length, now: done }}>
        <AppText variant="caption" tone="textMuted" testID="learn-progress">
          {t('learn.progress', { done: fmt(done), total: fmt(LESSONS.length) })}
        </AppText>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(done / LESSONS.length) * 100}%` }]} />
        </View>
      </View>
      {LESSONS.map((lesson, i) => {
        const finished = read.includes(lesson.id);
        const text = lesson[lang];
        return (
          <Pressable
            key={lesson.id}
            onPress={() => router.push({ pathname: '/learn/[id]', params: { id: lesson.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${t('learn.lessonNumber', { n: fmt(i + 1) })}. ${text.title}. ${finished ? t('learn.finished') : ''}`}
            testID={`learn-lesson-${lesson.id}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View
              style={[
                styles.badge,
                { backgroundColor: finished ? colors.primary : colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              {finished ? (
                <Icon name="check" size={18} color={colors.onPrimary} />
              ) : (
                <AppText variant="label" bold>
                  {fmt(i + 1)}
                </AppText>
              )}
            </View>
            <View style={styles.rowText}>
              <AppText variant="label" bold>
                {text.title}
              </AppText>
              <AppText variant="caption" tone="textMuted">
                {text.summary}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TAP,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
});
