import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, SettingRow } from '@/components';
import { useLanguage } from '@/hooks/useLanguage';
import { ensurePermission } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';
import { formatTime } from '@/utils/dates';
import { formatNumber } from '@/utils/numbers';

export function ReminderCard() {
  const { t } = useTranslation();
  const s = useSettings();
  const lang = useLanguage();
  const toast = useToast((x) => x.show);

  if (Platform.OS === 'web') return null;

  const reminderDate = new Date(2000, 0, 1, s.reminderHour, s.reminderMinute);
  const reminderText = formatTime(reminderDate, lang, { burmeseNumerals: s.burmeseNumerals });
  const step = (delta: number) => s.setReminderTime(s.reminderHour, s.reminderMinute + delta);

  const toggleReminder = async (on: boolean) => {
    if (!on) return s.setReminderEnabled(false);
    const granted = await ensurePermission();
    if (granted) s.setReminderEnabled(true);
    else toast(t('settings.permissionDenied'));
  };

  return (
    <Card>
      <SettingRow
        label={t('settings.reminder')}
        description={t('settings.reminderHint')}
        value={s.reminderEnabled}
        onValueChange={toggleReminder}
        testID="toggle-reminder"
      />
      {s.reminderEnabled ? (
        <View style={styles.time}>
          <AppText variant="label" bold testID="reminder-time">
            {t('settings.reminderTime', { time: reminderText })}
          </AppText>
          <View style={styles.timeButtons}>
            <Button
              label={t('settings.timeEarlier', { n: formatNumber(15, { burmeseNumerals: s.burmeseNumerals }) })}
              variant="secondary"
              onPress={() => step(-15)}
              style={styles.timeButton}
              testID="reminder-earlier"
            />
            <Button
              label={t('settings.timeLater', { n: formatNumber(15, { burmeseNumerals: s.burmeseNumerals }) })}
              variant="secondary"
              onPress={() => step(15)}
              style={styles.timeButton}
              testID="reminder-later"
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  time: { gap: spacing.sm },
  timeButtons: { flexDirection: 'row', gap: spacing.sm },
  timeButton: { flex: 1 },
});
