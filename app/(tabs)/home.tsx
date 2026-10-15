import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, DailyCardPanel, Header, Icon, Screen } from '@/components';
import { SPREADS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useJournal } from '@/store/journal';
import { useSettings } from '@/store/settings';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { formatDate, timeOfDay } from '@/utils/dates';
import { readingTitle } from '@/utils/readings';
import { getCard } from '@/data/cards';

export default function Home() {
  const { t } = useTranslation();
  const language = useLanguage();
  const fmt = useNumberFormat();
  const { colors } = useAppTheme();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const recent = useJournal((s) => s.readings).slice(0, 3);
  const now = new Date();
  return (
    <Screen testID="screen-home">
      <Header title={t(`greeting.${timeOfDay(now)}`)} subtitle={t('home.subtitle')} />
      <AppText tone="textMuted" testID="home-date">
        {t('home.todayIs', { date: formatDate(now, language, { style: 'weekday-long', burmeseNumerals }) })}
      </AppText>

      <DailyCardPanel />

      <View style={styles.section}>
        <AppText variant="heading" accessibilityRole="header">
          {t('home.startReading')}
        </AppText>
        {SPREADS.map((spread) => (
          <Pressable
            key={spread.id}
            onPress={() => router.push({ pathname: '/reading/[spreadId]', params: { spreadId: spread.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${spread[language].name}. ${spread[language].description}`}
            testID={`home-spread-${spread.id}`}
            style={({ pressed }) => [
              styles.spread,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
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
            <View style={styles.chevron}>
              <Icon name="back" size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}
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
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/journal/[id]', params: { id: r.id } })}
              accessibilityRole="button"
              testID={`home-recent-${r.id}`}
              style={({ pressed }) => [
                styles.recent,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AppText variant="label" bold>
                {readingTitle(r, language, t('journal.dailyLabel'))}
              </AppText>
              <AppText variant="caption" tone="textMuted" numberOfLines={1}>
                {formatDate(new Date(r.createdAt), language, { style: 'short', burmeseNumerals })} ·{' '}
                {r.cards.map((c) => getCard(c.cardId)?.[language].name ?? '').join(language === 'my' ? '၊ ' : ', ')}
              </AppText>
            </Pressable>
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
  recent: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
    minHeight: MIN_TAP,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: MIN_TAP,
  },
  spreadText: { flex: 1, gap: 2 },
  chevron: { transform: [{ rotate: '180deg' }] },
});
