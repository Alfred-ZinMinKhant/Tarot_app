import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';

import { Chip } from './Chip';

/**
 * Language picker. Each option is shown in its own script (English / မြန်မာ)
 * so people can find their language whatever the current UI language is.
 * Switching is instant — no restart.
 */
export function LanguageSwitch({ testID = 'language-switch' }: { testID?: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const setLanguage = useSettings((s) => s.setLanguage);
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('language.label')}>
      {LANGUAGES.map((lang) => (
        <Chip
          key={lang}
          label={t(`language.${lang}`)}
          accessibilityLabel={t('language.switchA11y', { language: t(`language.${lang}`) })}
          selected={language === lang}
          onPress={() => setLanguage(lang)}
          testID={`${testID}-${lang}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
