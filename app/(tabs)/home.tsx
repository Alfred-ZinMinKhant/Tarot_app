import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Header, Icon, Screen } from '@/components';
import { SPREADS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
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
  const now = new Date();
  return (
    <Screen testID="screen-home">
      <Header title={t(`greeting.${timeOfDay(now)}`)} subtitle={t('home.subtitle')} />
      <AppText tone="textMuted" testID="home-date">
        {t('home.todayIs', { date: formatDate(now, language, { style: 'weekday-long', burmeseNumerals }) })}
      </AppText>

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
