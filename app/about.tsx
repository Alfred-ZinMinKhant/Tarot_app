import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, BackButton, Button, Card, Header, Screen } from '@/components';
import { legalConfig } from '@/config/legal';
import { useNumberFormat } from '@/hooks/useNumberFormat';

export default function About() {
  const { t } = useTranslation();
  const fmt = useNumberFormat();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { publisher, contactEmail } = legalConfig();
  return (
    <Screen testID="screen-about">
      <BackButton fallback="/settings" />
      <Header title={t('about.title')} subtitle={t('settings.version', { version })} />
      <AppText>{t('about.body')}</AppText>
      <Card>
        <AppText variant="heading">{t('about.responsibleTitle')}</AppText>
        <AppText testID="about-disclaimer">{t('disclaimer.long')}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">{t('about.artTitle')}</AppText>
        <AppText>{t('about.artBody', { year: fmt(1909, { grouping: false }) })}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">{t('about.wordsTitle')}</AppText>
        <AppText>{t('about.wordsBody')}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">{t('about.chartTitle')}</AppText>
        <AppText testID="about-chart-credits">{t('about.chartBody', { version: `${fmt(4)}.${fmt(0)}` })}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">{t('about.signsTitle')}</AppText>
        <AppText>{t('sign.disclaimer')}</AppText>
      </Card>
      {publisher || contactEmail ? (
        <Card>
          {publisher ? <AppText>{t('about.publisher', { publisher })}</AppText> : null}
          {contactEmail ? <AppText>{t('about.contact', { email: contactEmail })}</AppText> : null}
        </Card>
      ) : null}
      <Button
        label={t('settings.privacy')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        testID="about-privacy"
      />
      <Button
        label={t('settings.terms')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
        testID="about-terms"
      />
    </Screen>
  );
}
