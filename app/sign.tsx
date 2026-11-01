import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Chip, Header, Screen } from '@/components';
import { SignCompass } from '@/components/SignCompass';
import { SignPicker } from '@/components/SignPicker';
import { dailyMood, getSign, SIGNS, type SignId } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';
import { localDateKey } from '@/utils/dates';

/** Weekday signs: your sign in detail, or explore any of the eight. */
export default function SignScreen() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const birthSign = useSettings((s) => s.birthSign);
  const setBirthSign = useSettings((s) => s.setBirthSign);
  const [viewing, setViewing] = useState<SignId | null>(birthSign);
  const [choosing, setChoosing] = useState(!birthSign);
  // Nothing is shown as a result until a sign is chosen or picked from the explore list.
  const sign = viewing ? getSign(viewing) : undefined;
  const isMine = sign?.id === birthSign;

  const choose = (id: SignId) => {
    setBirthSign(id);
    setViewing(id);
    setChoosing(false);
    toast(t('sign.saved'));
  };

  return (
    <Screen testID="screen-sign">
      <BackButton fallback="/home" />
      <Header title={t('sign.title')} subtitle={t('sign.subtitle')} />

      {choosing ? (
        <Card testID="sign-choose">
          <AppText variant="heading" accessibilityRole="header">
            {t('sign.choose')}
          </AppText>
          <SignPicker value={birthSign} onChange={choose} />
        </Card>
      ) : null}

      {sign ? (
        <>
          <Card testID="sign-detail">
            <View style={styles.hero}>
              <SignCompass
                sign={sign.id}
                size={96}
                accessibilityLabel={t('sign.compassA11y', { direction: sign[lang].direction })}
              />
              <View style={styles.heroText}>
                {isMine ? <Chip label={t('sign.yours')} selected /> : null}
                <AppText variant="title" accessibilityRole="header" testID="sign-name">
                  {sign[lang].name}
                </AppText>
              </View>
            </View>
            <Fact label={t('sign.animal')} value={sign[lang].animal} />
            <Fact label={t('sign.planet')} value={sign[lang].planet} />
            <Fact label={t('sign.direction')} value={sign[lang].direction} />
            <Fact
              label={t('sign.traits')}
              value={sign[lang].traits.join(lang === 'my' ? '၊ ' : ', ')}
            />
          </Card>

          <Card>
            <AppText variant="heading">{t('sign.todayMood')}</AppText>
            <AppText testID="sign-mood">{dailyMood(sign, localDateKey(new Date()), lang)}</AppText>
          </Card>

          <Card>
            <AppText variant="heading">{t('sign.personality')}</AppText>
            <AppText>{sign[lang].personality}</AppText>
          </Card>

          {!choosing && !isMine ? (
            <Button
              label={t('sign.setMine')}
              onPress={() => choose(sign.id)}
              testID="sign-set-mine"
            />
          ) : null}
        </>
      ) : null}

      {!choosing && birthSign ? (
        <Button
          label={t('sign.change')}
          variant="ghost"
          onPress={() => setChoosing(true)}
          testID="sign-change"
        />
      ) : null}

      <View style={styles.explore}>
        <AppText variant="heading" accessibilityRole="header">
          {t('sign.explore')}
        </AppText>
        <View style={styles.chips}>
          {SIGNS.map((s) => (
            <Chip
              key={s.id}
              label={s[lang].name}
              selected={s.id === viewing}
              onPress={() => setViewing(s.id)}
              testID={`sign-explore-${s.id}`}
            />
          ))}
        </View>
      </View>

      <Button
        label={t('home.chartTitle')}
        variant="secondary"
        onPress={() => router.push('/birth-chart')}
        testID="sign-open-chart"
      />

      <AppText variant="caption" tone="textMuted" center>
        {t('sign.disclaimer')}
      </AppText>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" tone="textMuted">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  fact: { gap: 2 },
  explore: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
