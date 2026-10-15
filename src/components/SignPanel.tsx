import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { dailyMood, getSign } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import { localDateKey } from '@/utils/dates';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { SignCompass } from './SignCompass';

/** Home card for the Burmese weekday sign: today's light-hearted mood, or an invitation to pick one. */
export function SignPanel() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const sign = getSign(useSettings((s) => s.birthSign));

  if (!sign) {
    return (
      <Card testID="home-sign-empty">
        <AppText variant="heading" accessibilityRole="header">
          {t('home.signEmptyTitle')}
        </AppText>
        <AppText tone="textMuted">{t('home.signEmptyBody')}</AppText>
        <Button label={t('home.signFind')} variant="secondary" onPress={() => router.push('/sign')} testID="home-sign-find" />
      </Card>
    );
  }

  const text = sign[lang];
  return (
    <Card testID="home-sign">
      <View style={styles.row}>
        <SignCompass sign={sign.id} size={64} />
        <View style={styles.text}>
          <AppText variant="caption" tone="textMuted">
            {t('home.signTitle')}
          </AppText>
          <AppText variant="heading">{text.name}</AppText>
          <AppText variant="caption" tone="accent">
            {t('sign.animalPlanet', { animal: text.animal, planet: text.planet })}
          </AppText>
        </View>
      </View>
      <AppText testID="home-sign-mood">{dailyMood(sign, localDateKey(new Date()), lang)}</AppText>
      <Button label={t('home.signOpen')} variant="ghost" onPress={() => router.push('/sign')} testID="home-sign-open" />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
