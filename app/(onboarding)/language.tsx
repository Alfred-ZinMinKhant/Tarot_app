import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, LanguageSwitch } from '@/components';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { useSettings } from '@/store/settings';

export default function LanguageStep() {
  const { t } = useTranslation();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const skip = () => {
    completeOnboarding();
    router.replace('/home');
  };
  return (
    <OnboardingFrame
      testID="onboarding-language-step"
      step={2}
      total={3}
      title={t('onboarding.languageTitle')}
      body={t('onboarding.languageBody')}
      primaryLabel={t('common.continue')}
      onPrimary={() => router.push('/about-you')}
      onSkip={skip}
    >
      <LanguageSwitch testID="onboarding-language" />
      <Card>
        <AppText variant="caption" tone="textMuted">
          {t('settings.preview')}
        </AppText>
        <AppText>{t('settings.previewText')}</AppText>
      </Card>
    </OnboardingFrame>
  );
}
