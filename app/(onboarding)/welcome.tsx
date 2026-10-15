import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/components';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { useSettings } from '@/store/settings';

export default function Welcome() {
  const { t } = useTranslation();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  return (
    <OnboardingFrame
      testID="onboarding-welcome"
      step={1}
      total={2}
      title={t('onboarding.welcomeTitle')}
      body={t('onboarding.welcomeBody')}
      primaryLabel={t('common.continue')}
      onPrimary={() => router.push('/language')}
      onSkip={() => {
        completeOnboarding();
        router.replace('/home');
      }}
    >
      <LanguageSwitch testID="onboarding-language" />
    </OnboardingFrame>
  );
}
