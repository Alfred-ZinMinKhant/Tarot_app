import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, LanguageSwitch } from '@/components';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { useSettings } from '@/store/settings';

export default function Welcome() {
  const { t } = useTranslation();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  return (
    <OnboardingFrame
      testID="onboarding-welcome"
      step={1}
      total={3}
      title={t('onboarding.welcomeTitle')}
      body={t('onboarding.welcomeBody')}
      primaryLabel={t('common.continue')}
      onPrimary={() => router.push('/about-you')}
      onSkip={() => {
        completeOnboarding();
        router.replace('/home');
      }}
    >
      <LanguageSwitch testID="onboarding-language" />
      <Card testID="onboarding-disclaimer">
        <AppText variant="label" bold>
          {t('onboarding.disclaimerTitle')}
        </AppText>
        <AppText variant="caption">{t('disclaimer.long')}</AppText>
      </Card>
    </OnboardingFrame>
  );
}
