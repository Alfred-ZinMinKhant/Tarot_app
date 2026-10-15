import { useTranslation } from 'react-i18next';

import { EmptyState, Header, Screen } from '@/components';

export default function Journal() {
  const { t } = useTranslation();
  return (
    <Screen testID="screen-journal">
      <Header title={t('journal.title')} />
      <EmptyState icon="journal" title={t('journal.emptyTitle')} body={t('journal.emptyBody')} />
    </Screen>
  );
}
