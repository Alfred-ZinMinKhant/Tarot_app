import { useTranslation } from 'react-i18next';

import { Header, Screen } from '@/components';
import { AdPrivacyRow } from '@/components/AdPrivacyRow';
import { CloudSyncCard } from '@/components/CloudSyncCard';
import { PremiumCard } from '@/components/PremiumCard';
import {
  AboutCard,
  AppearanceCard,
  DataCard,
  ProfileCards,
  ReadingsCard,
  ReminderCard,
} from '@/components/settings';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <Screen testID="screen-settings">
      <Header title={t('settings.title')} />
      <ProfileCards />
      <AppearanceCard />
      <ReadingsCard />
      <ReminderCard />
      <PremiumCard />
      <AdPrivacyRow />
      <CloudSyncCard />
      <DataCard />
      <AboutCard />
    </Screen>
  );
}
