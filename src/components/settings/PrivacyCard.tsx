import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { AppText, Card, SettingRow } from '@/components';
import { analyticsConfig } from '@/config/analytics';
import { useSettings } from '@/store/settings';

/** Settings → Privacy: the usage-statistics switch. Hidden in builds that send no statistics. */
export function PrivacyCard() {
  const { t } = useTranslation();
  const enabled = useSettings((s) => s.analyticsEnabled);
  const setEnabled = useSettings((s) => s.setAnalyticsEnabled);
  if (Platform.OS === 'web' || !analyticsConfig()) return null;
  return (
    <Card testID="privacy-card">
      <AppText variant="heading">{t('settings.privacyHeading')}</AppText>
      <SettingRow
        label={t('settings.analytics')}
        description={t('settings.analyticsHint')}
        value={enabled}
        onValueChange={setEnabled}
        testID="toggle-analytics"
      />
    </Card>
  );
}
