import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';

import { purchasesAvailable, usePremium } from '@/store/premium';
import { useToast } from '@/store/toast';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

const MANAGE_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
});

/** Settings → Premium. Hidden in builds that don't sell Premium. */
export function PremiumCard() {
  const { t } = useTranslation();
  const toast = useToast((s) => s.show);
  const isPremium = usePremium((s) => s.isPremium);
  const restore = usePremium((s) => s.restore);
  if (!purchasesAvailable()) return null;

  const onRestore = async () => {
    const result = await restore();
    toast(
      result === true ? t('premium.restored') : result === false ? t('premium.nothingToRestore') : t('premium.restoreFailed'),
    );
  };

  return (
    <Card testID="premium-card">
      <AppText variant="heading">{t('premium.settingsTitle')}</AppText>
      <AppText testID="premium-status">{isPremium ? t('premium.statusPremium') : t('premium.statusFree')}</AppText>
      {isPremium ? (
        MANAGE_URL ? (
          <Button
            label={t('premium.manage')}
            variant="secondary"
            onPress={() => void Linking.openURL(MANAGE_URL)}
            testID="premium-manage"
          />
        ) : null
      ) : (
        <Button label={t('premium.see')} onPress={() => router.push('/paywall')} testID="premium-see" />
      )}
      <Button label={t('premium.restore')} variant="ghost" onPress={onRestore} testID="premium-restore" />
    </Card>
  );
}
