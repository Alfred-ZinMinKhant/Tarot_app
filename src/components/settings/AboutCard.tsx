import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Share } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { storeLinks } from '@/config/store';
import { logError } from '@/utils/log';

export function AboutCard() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const store = storeLinks();

  const shareApp = async () => {
    if (!store) return;
    try {
      await Share.share({ message: t('settings.shareAppMessage', { url: store.listing }) });
    } catch (e) {
      logError('shareApp', e);
    }
  };
  const rateApp = async () => {
    if (!store) return;
    try {
      await Linking.openURL(store.review);
    } catch {
      // No store app on this device (e.g. an emulator): the web listing still works.
      Linking.openURL(store.listing).catch((e) => logError('rateApp', e));
    }
  };

  return (
    <Card>
      <AppText variant="heading">{t('settings.about')}</AppText>
      <AppText variant="caption">{t('disclaimer.short')}</AppText>
      <Button label={t('about.title')} variant="secondary" onPress={() => router.push('/about')} testID="settings-about" />
      {store ? (
        <>
          <Button label={t('settings.shareApp')} variant="secondary" onPress={shareApp} testID="settings-share-app" />
          <Button label={t('settings.rateApp')} variant="secondary" onPress={rateApp} testID="settings-rate-app" />
        </>
      ) : null}
      <Button
        label={t('settings.privacy')}
        variant="ghost"
        onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        testID="settings-privacy"
      />
      <Button
        label={t('settings.terms')}
        variant="ghost"
        onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
        testID="settings-terms"
      />
      <AppText variant="caption" tone="textMuted" center testID="settings-version">
        {t('settings.version', { version })}
      </AppText>
    </Card>
  );
}
