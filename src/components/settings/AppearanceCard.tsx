import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, ChipGroup, SettingRow } from '@/components';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import type { FontSizeSetting, MyanmarFont } from '@/theme/typography';
import { formatNumber } from '@/utils/numbers';

export function AppearanceCard() {
  const { t } = useTranslation();
  const s = useSettings();

  return (
    <Card>
      <AppText variant="heading">{t('settings.appearance')}</AppText>
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
  );
}

const styles = StyleSheet.create({
  preview: { gap: spacing.xs, paddingTop: spacing.sm },
});
