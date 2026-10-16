import { useTranslation } from 'react-i18next';

import { useAds } from '@/store/ads';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

/** Settings → ad privacy choices. Only where the law requires viewers to be able to change them. */
export function AdPrivacyRow() {
  const { t } = useTranslation();
  const required = useAds((s) => s.privacyOptions);
  const open = useAds((s) => s.openPrivacyOptions);
  if (!required) return null;
  return (
    <Card testID="ad-privacy-card">
      <AppText variant="heading">{t('ads.privacyTitle')}</AppText>
      <AppText>{t('ads.privacyBody')}</AppText>
      <Button label={t('ads.privacyButton')} variant="secondary" onPress={() => void open()} testID="ad-privacy-open" />
    </Card>
  );
}
