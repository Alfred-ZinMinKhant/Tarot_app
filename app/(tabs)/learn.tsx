import { useTranslation } from 'react-i18next';

import { EmptyState, Header, Screen } from '@/components';

export default function Learn() {
  const { t } = useTranslation();
  return (
    <Screen testID="screen-learn">
      <Header title={t('learn.title')} />
      <EmptyState icon="learn" title={t('learn.emptyTitle')} body={t('learn.emptyBody')} />
    </Screen>
  );
}
