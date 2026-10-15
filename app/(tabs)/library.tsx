import { useTranslation } from 'react-i18next';

import { EmptyState, Header, Screen } from '@/components';

export default function Library() {
  const { t } = useTranslation();
  return (
    <Screen testID="screen-library">
      <Header title={t('library.title')} />
      <EmptyState icon="cards" title={t('library.emptyTitle')} body={t('library.emptyBody')} />
    </Screen>
  );
}
