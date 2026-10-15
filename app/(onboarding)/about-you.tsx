import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { AppText, Card, SettingRow } from '@/components';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { SignPicker } from '@/components/SignPicker';
import { TextField } from '@/components/TextField';
import type { SignId } from '@/data/content';
import { ensurePermission } from '@/services/notifications';
import { useSettings } from '@/store/settings';

/** Onboarding step 3: optional name, birth weekday and daily reminder. */
export default function AboutYou() {
  const { t } = useTranslation();
  const s = useSettings();
  const [name, setName] = useState(s.name);
  const [sign, setSign] = useState<SignId | null>(s.birthSign);
  const [reminder, setReminder] = useState(s.reminderEnabled);

  const toggleReminder = async (on: boolean) => {
    if (!on) return setReminder(false);
    setReminder(await ensurePermission());
  };

  const finish = (save: boolean) => {
    if (save) {
      s.setName(name);
      s.setBirthSign(sign);
      s.setReminderEnabled(reminder);
    }
    s.completeOnboarding();
    router.replace('/home');
  };

  return (
    <OnboardingFrame
      testID="onboarding-about-you"
      step={3}
      total={3}
      title={t('onboarding.aboutTitle')}
      body={t('onboarding.aboutBody')}
      primaryLabel={t('common.getStarted')}
      onPrimary={() => finish(true)}
      onSkip={() => finish(false)}
    >
      <TextField
        label={t('onboarding.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('onboarding.namePlaceholder')}
        autoCapitalize="words"
        autoComplete="given-name"
        maxLength={40}
        testID="onboarding-name"
      />
      <Card>
        <AppText variant="label" bold>
          {t('onboarding.signLabel')}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {t('onboarding.signHint')}
        </AppText>
        <SignPicker value={sign} onChange={setSign} testID="onboarding-sign" />
      </Card>
      {Platform.OS !== 'web' ? (
        <Card>
          <SettingRow
            label={t('onboarding.reminderLabel')}
            description={t('onboarding.reminderHint')}
            value={reminder}
            onValueChange={toggleReminder}
            testID="onboarding-reminder"
          />
        </Card>
      ) : null}
    </OnboardingFrame>
  );
}
