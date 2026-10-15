import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ChipGroup, Header, LanguageSwitch, Screen, SettingRow } from '@/components';
import { useLanguage } from '@/hooks/useLanguage';
import { ensurePermission } from '@/services/notifications';
import { useToast } from '@/store/toast';
import { formatTime } from '@/utils/dates';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import type { FontSizeSetting, MyanmarFont } from '@/theme/typography';
import type { ThemeMode } from '@/store/settings';
import { formatNumber } from '@/utils/numbers';

export default function Settings() {
  const { t } = useTranslation();
  const s = useSettings();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const lang = useLanguage();
  const toast = useToast((x) => x.show);
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
    <Screen testID="screen-settings">
      <Header title={t('settings.title')} />

      <Card>
        <SettingRow label={t('language.label')}>
          <LanguageSwitch testID="settings-language" />
        </SettingRow>
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.appearance')}</AppText>
        <SettingRow label={t('settings.theme')}>
          <ChipGroup<ThemeMode>
            testIDPrefix="theme"
            value={s.themeMode}
            onChange={s.setThemeMode}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </SettingRow>
        <SettingRow label={t('settings.fontSize')}>
          <ChipGroup<FontSizeSetting>
            testIDPrefix="font-size"
            value={s.fontSize}
            onChange={s.setFontSize}
            options={[
              { value: 'S', label: t('settings.fontSizeS') },
              { value: 'M', label: t('settings.fontSizeM') },
              { value: 'L', label: t('settings.fontSizeL') },
            ]}
          />
        </SettingRow>
        <SettingRow label={t('settings.myanmarFont')}>
          <ChipGroup<MyanmarFont>
            testIDPrefix="myanmar-font"
            value={s.myanmarFont}
            onChange={s.setMyanmarFont}
            options={[
              { value: 'noto', label: t('settings.fontNoto') },
              { value: 'padauk', label: t('settings.fontPadauk') },
            ]}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.burmeseNumerals')}
          value={s.burmeseNumerals}
          onValueChange={s.setBurmeseNumerals}
          testID="toggle-burmese-numerals"
        />
        <View style={styles.preview}>
          <AppText variant="caption" tone="textMuted">
            {t('settings.preview')}
          </AppText>
          <AppText>{t('settings.previewText')}</AppText>
          <AppText tone="textMuted" testID="numeral-preview">
            {formatNumber(1909, { burmeseNumerals: s.burmeseNumerals, grouping: false })} ·{' '}
            {formatNumber(78, { burmeseNumerals: s.burmeseNumerals })}
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.readings')}</AppText>
        <SettingRow
          label={t('settings.reversedCards')}
          description={t('settings.reversedCardsHint')}
          value={s.reversedCards}
          onValueChange={s.setReversedCards}
          testID="toggle-reversed-cards"
        />
        <SettingRow
          label={t('settings.haptics')}
          value={s.haptics}
          onValueChange={s.setHaptics}
          testID="toggle-haptics"
        />
      </Card>

      {Platform.OS !== 'web' ? (
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
      ) : null}

      <Card>
        <AppText variant="heading">{t('settings.about')}</AppText>
        <AppText>{t('disclaimer.long')}</AppText>
        <AppText variant="caption" tone="textMuted">
          {t('settings.version', { version })}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: spacing.xs, paddingTop: spacing.sm },
  time: { gap: spacing.sm },
  timeButtons: { flexDirection: 'row', gap: spacing.sm },
  timeButton: { flex: 1 },
});
