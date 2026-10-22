import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, LanguageSwitch, SettingRow } from '@/components';
import { TextField } from '@/components/TextField';
import { getSign } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';

/** Language, birth chart, and the name / birth sign profile fields. */
export function ProfileCards() {
  const { t } = useTranslation();
  const s = useSettings();
  const lang = useLanguage();
  const sign = getSign(s.birthSign);

  return (
    <>
      <Card>
        <SettingRow label={t('language.label')}>
          <LanguageSwitch testID="settings-language" />
        </SettingRow>
        <SettingRow
          label={t('settings.birthChart')}
          description={s.birth ? t('settings.birthChartSet') : t('settings.birthChartNone')}
        >
          <Button
            label={s.birth ? t('settings.birthChartOpen') : t('settings.birthChartCreate')}
            variant="secondary"
            onPress={() => router.push('/birth-chart')}
            testID="settings-birth-chart"
          />
        </SettingRow>
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.profile')}</AppText>
        <TextField
          label={t('settings.name')}
          hint={t('settings.nameHint')}
          value={s.name}
          onChangeText={s.setName}
          placeholder={t('onboarding.namePlaceholder')}
          autoCapitalize="words"
          maxLength={40}
          testID="settings-name"
        />
        <SettingRow label={t('settings.birthSign')} description={sign ? sign[lang].name : t('settings.birthSignNone')}>
          <Button
            label={sign ? t('settings.birthSignOpen') : t('settings.birthSignChoose')}
            variant="secondary"
            onPress={() => router.push('/sign')}
            testID="settings-sign"
          />
        </SettingRow>
      </Card>
    </>
  );
}
