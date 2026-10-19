import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DailyCardPanel, Header, Icon, ReadingRow, Screen } from '@/components';
import { ChartPreview } from '@/components/ChartPreview';
import { SignPanel } from '@/components/SignPanel';
import { SpreadGlyph } from '@/components/art/SpreadGlyph';
import { isPremiumSpread } from '@/premium/features';
import { purchasesAvailable } from '@/store/premium';
import { useSpreadsUnlocked } from '@/store/spreadAccess';
import { SPREADS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useJournal } from '@/store/journal';
import { useSettings } from '@/store/settings';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { formatDate, timeOfDay } from '@/utils/dates';

export default function Home() {
  const { t } = useTranslation();
  const language = useLanguage();
  const fmt = useNumberFormat();
  const { colors } = useAppTheme();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const recent = useJournal((s) => s.readings).slice(0, 3);
  const unlocked = useSpreadsUnlocked();
  const lockBadge = t(purchasesAvailable() ? 'premium.badge' : 'ads.badge');
  const name = useSettings((s) => s.name).trim();
  const birth = useSettings((s) => s.birth);
  const hasChart = birth !== null;
  const nudgeDismissed = useSettings((s) => s.chartNudgeDismissed);
  const dismissNudge = useSettings((s) => s.dismissChartNudge);
  const now = new Date();
  const greeting = t(`greeting.${timeOfDay(now)}`);
  return (
    <Screen testID="screen-home" ad>
      <Header
        title={name ? t('greeting.withName', { greeting, name }) : greeting}
        subtitle={t('home.subtitle')}
      />
      <AppText tone="textMuted" testID="home-date">
        {t('home.todayIs', {
          date: formatDate(now, language, { style: 'weekday-long', burmeseNumerals }),
        })}
      </AppText>

      <DailyCardPanel />
      <SignPanel />
      {!hasChart && !nudgeDismissed ? (
        <Card testID="home-chart-nudge">
          <AppText variant="heading" accessibilityRole="header">
            {t('home.chartNudgeTitle')}
          </AppText>
          <AppText tone="textMuted">{t('home.chartNudgeBody')}</AppText>
          <Button label={t('home.chartNudgeCreate')} onPress={() => router.push('/birth-chart')} testID="home-chart-nudge-create" />
          <Button label={t('home.chartNudgeDismiss')} variant="ghost" onPress={dismissNudge} testID="home-chart-nudge-dismiss" />
        </Card>
      ) : null}
      <Pressable
        onPress={() => router.push('/birth-chart')}
        accessibilityRole="button"
        accessibilityLabel={`${t('home.chartTitle')}. ${t('home.chartBody')}`}
        testID="home-birth-chart"
        style={({ pressed }) => [
          styles.spread,
          { backgroundColor: colors.surface, borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ChartPreview birth={birth} size={84} />
        <View style={styles.spreadText}>
          <AppText variant="label" bold>
            {t('home.chartTitle')}
          </AppText>
          <AppText variant="caption" tone="textMuted">
            {hasChart ? t('home.chartBody') : t('home.chartSampleBody')}
          </AppText>
        </View>
        <View style={styles.chevron}>
          <Icon name="back" size={20} color={colors.textMuted} />
        </View>
      </Pressable>

      <View style={styles.section}>
        <AppText variant="heading" accessibilityRole="header">
          {t('home.startReading')}
        </AppText>
        {SPREADS.map((spread) => {
          const locked = !unlocked && isPremiumSpread(spread.id);
          return (
            <Pressable
              key={spread.id}
              onPress={() =>
                locked
                  ? router.push({ pathname: '/paywall', params: { reason: `spread:${spread.id}` } })
                  : router.push({
                      pathname: '/reading/[spreadId]',
                      params: { spreadId: spread.id },
                    })
              }
              accessibilityRole="button"
              accessibilityLabel={`${spread[language].name}. ${spread[language].description}${locked ? `. ${lockBadge}` : ''}`}
              testID={`home-spread-${spread.id}`}
              style={({ pressed }) => [
                styles.spread,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.glyph, { backgroundColor: colors.surfaceAlt }]}>
                <SpreadGlyph spread={spread} size={64} color={colors.primary} fill={colors.surface} />
              </View>
              <View style={styles.spreadText}>
                <AppText variant="label" bold>
                  {spread[language].name}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {spread[language].description}
                </AppText>
                <AppText variant="caption" tone="accent">
                  {t('home.spreadCards', { n: fmt(spread.cardCount) })}
                </AppText>
              </View>
              {locked ? (
                <View
                  style={[styles.premium, { borderColor: colors.primary }]}
                  testID={`home-spread-lock-${spread.id}`}
                >
                  <Icon name="lock" size={14} color={colors.primary} />
                  <AppText variant="caption" tone="primary" bold>
                    {lockBadge}
                  </AppText>
                </View>
              ) : (
                <View style={styles.chevron}>
                  <Icon name="back" size={20} color={colors.textMuted} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {recent.length ? (
        <View style={styles.section} testID="home-recent">
          <View style={styles.sectionHeader}>
            <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
              {t('home.recentTitle')}
            </AppText>
            <Pressable
              onPress={() => router.push('/journal')}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.seeAll}
              testID="home-see-all"
            >
              <AppText variant="label" tone="accent">
                {t('home.seeAll')}
              </AppText>
            </Pressable>
          </View>
          {recent.map((r) => (
            <ReadingRow key={r.id} reading={r} lang={language} testID={`home-recent-${r.id}`} />
          ))}
        </View>
      ) : null}

      <Card>
        <AppText variant="heading">{t('home.introTitle')}</AppText>
        <AppText>{t('home.introBody')}</AppText>
      </Card>
      <AppText variant="caption" tone="textMuted" center>
        {t('disclaimer.short')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  seeAll: { minHeight: MIN_TAP, justifyContent: 'center' },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: MIN_TAP,
  },
  glyph: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  spreadText: { flex: 1, gap: 2 },
  chevron: { transform: [{ rotate: '180deg' }] },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
