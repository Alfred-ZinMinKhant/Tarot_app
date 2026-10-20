import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, SettingRow } from '@/components';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { SignPicker } from '@/components/SignPicker';
import { TextField } from '@/components/TextField';
import { signForBirthDate, type SignId } from '@/data/content';
import { ensurePermission } from '@/services/notifications';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import { pad2 } from '@/utils/dates';
import { toLatinDigits } from '@/utils/numbers';

/** Onboarding step 3: optional name, birth date (gives the weekday sign, then the chart) and daily reminder. */
export default function AboutYou() {
  const { t } = useTranslation();
  const s = useSettings();
  const fmt = useNumberFormat();
  const [name, setName] = useState(s.name);
  const [sign, setSign] = useState<SignId | null>(s.birthSign);
  const [weekdayOnly, setWeekdayOnly] = useState(false);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [afternoon, setAfternoon] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [reminder, setReminder] = useState(s.reminderEnabled);

  const toggleReminder = async (on: boolean) => {
    if (!on) return setReminder(false);
    setReminder(await ensurePermission());
  };

  // Burmese digits typed on a Myanmar keyboard count the same as Latin ones.
  const [dd, mm, yyyy] = [day, month, year].map((v) => Number.parseInt(toLatinDigits(v.trim()), 10));
  const hasDate = [day, month, year].some((v) => v.trim() !== '');
  const weekday = hasDate ? signForBirthDate(yyyy!, mm!, dd!) : null;
  const isWednesday = weekday === 'wednesday' || weekday === 'rahu';

  const finish = (save: boolean) => {
    let chartDate: string | null = null;
    if (save) {
      let birthSign = sign;
      if (!weekdayOnly && hasDate) {
        const fromDate = signForBirthDate(yyyy!, mm!, dd!, afternoon);
        if (!fromDate) return setDateError(true);
        birthSign = fromDate;
        chartDate = `${String(yyyy).padStart(4, '0')}-${pad2(mm!)}-${pad2(dd!)}`;
      }
      s.setName(name);
      s.setBirthSign(birthSign);
      s.setReminderEnabled(reminder);
    }
    // A date leads to the chart step, which asks for the time and place the chart needs.
    if (chartDate) return router.push({ pathname: '/your-chart', params: { date: chartDate } });
    s.completeOnboarding();
    router.replace('/home');
  };

  return (
    <OnboardingFrame
      testID="onboarding-about-you"
      step={2}
      total={3}
      title={t('onboarding.aboutTitle')}
      body={t('onboarding.aboutBody')}
      primaryLabel={t(hasDate && !weekdayOnly ? 'common.continue' : 'common.getStarted')}
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
          {t(weekdayOnly ? 'onboarding.signLabel' : 'onboarding.birthDateLabel')}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {t(weekdayOnly ? 'onboarding.signHint' : 'onboarding.birthDateHint')}
        </AppText>
        {weekdayOnly ? (
          <SignPicker value={sign} onChange={setSign} testID="onboarding-sign" />
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.field}>
                <TextField label={t('sign.day')} value={day} onChangeText={(v) => { setDay(v); setDateError(false); }} keyboardType="number-pad" maxLength={2} placeholder={fmt(15)} testID="onboarding-day" />
              </View>
              <View style={styles.field}>
                <TextField label={t('sign.month')} value={month} onChangeText={(v) => { setMonth(v); setDateError(false); }} keyboardType="number-pad" maxLength={2} placeholder={fmt(6)} testID="onboarding-month" />
              </View>
              <View style={styles.yearField}>
                <TextField label={t('sign.year')} value={year} onChangeText={(v) => { setYear(v); setDateError(false); }} keyboardType="number-pad" maxLength={4} placeholder={fmt(1995, { grouping: false })} testID="onboarding-year" />
              </View>
            </View>
            {isWednesday ? (
              <SettingRow
                label={t('sign.afternoon')}
                description={t('sign.afternoonHint')}
                value={afternoon}
                onValueChange={setAfternoon}
                testID="onboarding-afternoon"
              />
            ) : null}
            {dateError ? (
              <AppText tone="danger" accessibilityLiveRegion="polite" testID="onboarding-date-error">
                {t('onboarding.dateInvalid')}
              </AppText>
            ) : null}
          </>
        )}
        <Button
          label={t(weekdayOnly ? 'onboarding.dateOnly' : 'onboarding.weekdayOnly')}
          variant="ghost"
          onPress={() => setWeekdayOnly(!weekdayOnly)}
          testID="onboarding-toggle-weekday"
        />
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  yearField: { flex: 1.5 },
});
