import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { isBirthDate } from '@/astro/birth';
import { BirthFormFields } from '@/components/BirthFormFields';
import { ChartPreview } from '@/components/ChartPreview';
import { AppText } from '@/components/AppText';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { useBirthForm } from '@/hooks/useBirthForm';
import { useSettings } from '@/store/settings';

/** Onboarding step 4: birth time and place, so the first chart has a Rising sign and houses. */
export default function YourChart() {
  const { t } = useTranslation();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const setBirth = useSettings((s) => s.setBirth);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const form = useBirthForm({ date: isBirthDate(date) ? date : null });

  const finish = (chart: boolean) => {
    completeOnboarding();
    router.replace('/home');
    if (chart) router.push('/birth-chart');
  };

  return (
    <OnboardingFrame
      testID="onboarding-your-chart"
      step={3}
      total={3}
      title={t('onboarding.chartTitle')}
      body={t('onboarding.chartBody')}
      primaryLabel={t('onboarding.chartSee')}
      onPrimary={() => {
        const data = form.submit();
        if (!data) return;
        setBirth(data);
        finish(true);
      }}
      onSkip={() => finish(false)}
    >
      <ChartPreview birth={null} size={180} />
      <AppText variant="caption" tone="textMuted" center testID="onboarding-chart-sample-note">
        {t('onboarding.chartSampleNote')}
      </AppText>
      <BirthFormFields form={form} />
    </OnboardingFrame>
  );
}
