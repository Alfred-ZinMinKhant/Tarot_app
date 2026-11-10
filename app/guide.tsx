import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Header, Screen } from '@/components';
import { SpreadGlyph } from '@/components/art/SpreadGlyph';
import { getSpread, type Topic } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { isPremiumSpread } from '@/premium/features';
import { useSpreadsUnlocked } from '@/store/spreadAccess';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

type Answer = { id: 'quick' | 'unfold' | 'situation' | 'career' | 'money' | 'week' | 'month' | 'love' | 'deep'; spreadId: string; topic: Topic };

const ANSWERS: readonly Answer[] = [
  { id: 'quick', spreadId: 'one-card', topic: 'general' },
  { id: 'unfold', spreadId: 'three-past-present-future', topic: 'general' },
  { id: 'situation', spreadId: 'three-situation-challenge-advice', topic: 'general' },
  { id: 'career', spreadId: 'three-situation-challenge-advice', topic: 'career' },
  { id: 'money', spreadId: 'three-situation-challenge-advice', topic: 'money' },
  { id: 'week', spreadId: 'week-ahead', topic: 'general' },
  { id: 'month', spreadId: 'month-ahead', topic: 'general' },
  { id: 'love', spreadId: 'love', topic: 'love' },
  { id: 'deep', spreadId: 'celtic-cross', topic: 'general' },
];

/** First-timer guide: one question, then a suggested spread to start. */
export default function Guide() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const { colors } = useAppTheme();
  const unlocked = useSpreadsUnlocked();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const spread = answer ? getSpread(answer.spreadId) : undefined;

  const start = () => {
    if (!answer || !spread) return;
    const locked = !unlocked && isPremiumSpread(spread.id);
    if (locked) router.replace({ pathname: '/paywall', params: { reason: `spread:${spread.id}` } });
    else router.replace({ pathname: '/reading/[spreadId]', params: { spreadId: spread.id, topic: answer.topic } });
  };

  return (
    <Screen testID="screen-guide">
      <BackButton fallback="/home" />
      <Header title={t('guide.title')} subtitle={t('guide.subtitle')} />

      {answer && spread ? (
        <View style={styles.group} testID="guide-result">
          <AppText variant="label" tone="textMuted">
            {t('guide.suggest')}
          </AppText>
          <Card>
            <View style={styles.row}>
              <View style={[styles.glyph, { backgroundColor: colors.surfaceAlt }]}>
                <SpreadGlyph spread={spread} size={64} color={colors.primary} fill={colors.surface} />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading" accessibilityRole="header" testID="guide-spread-name">
                  {spread[lang].name}
                </AppText>
                <AppText tone="textMuted">{spread[lang].description}</AppText>
              </View>
            </View>
          </Card>
          <AppText variant="caption" tone="textMuted">
            {t('guide.tip')}
          </AppText>
          <Button label={t('guide.start')} onPress={start} testID="guide-start" />
          <Button label={t('guide.other')} variant="ghost" onPress={() => setAnswer(null)} testID="guide-back" />
        </View>
      ) : (
        <View style={styles.group}>
          <AppText variant="heading" accessibilityRole="header">
            {t('guide.question')}
          </AppText>
          {ANSWERS.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAnswer(a)}
              accessibilityRole="button"
              accessibilityLabel={`${t(`guide.${a.id}`)}. ${t(`guide.${a.id}Hint`)}`}
              testID={`guide-answer-${a.id}`}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AppText variant="label" bold>
                {t(`guide.${a.id}`)}
              </AppText>
              <AppText variant="caption" tone="textMuted">
                {t(`guide.${a.id}Hint`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  glyph: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  option: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
});
