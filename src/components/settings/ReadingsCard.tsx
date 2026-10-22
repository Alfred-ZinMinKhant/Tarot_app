import { useTranslation } from 'react-i18next';

import { AppText, Card, SettingRow } from '@/components';
import { useSettings } from '@/store/settings';

export function ReadingsCard() {
  const { t } = useTranslation();
  const s = useSettings();

  return (
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
      <SettingRow
        label={t('settings.sound')}
        description={t('settings.soundHint')}
        value={s.soundEnabled}
        onValueChange={s.setSoundEnabled}
        testID="toggle-sound"
      />
    </Card>
  );
}
