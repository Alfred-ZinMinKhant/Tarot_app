import { useTranslation } from 'react-i18next';

import { AppText, Card, Header, Screen } from '@/components';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { formatDate, timeOfDay } from '@/utils/dates';

export default function Home() {
  const { t } = useTranslation();
  const language = useLanguage();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const now = new Date();
  return (
    <Screen testID="screen-home">
      <Header title={t(`greeting.${timeOfDay(now)}`)} subtitle={t('home.subtitle')} />
      <AppText tone="textMuted" testID="home-date">
        {t('home.todayIs', { date: formatDate(now, language, { style: 'weekday-long', burmeseNumerals }) })}
      </AppText>
      <Card>
        <AppText variant="heading">{t('home.introTitle')}</AppText>
        <AppText>{t('home.introBody')}</AppText>
      </Card>
      <AppText variant="caption" tone="textMuted" center>
        {t('disclaimer.short')}
      </AppText>
    </Screen>
  );
}
