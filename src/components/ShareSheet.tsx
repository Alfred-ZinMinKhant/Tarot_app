import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, type View } from 'react-native';

import { router } from 'expo-router';

import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { rewardedConfigured, useAds, useRewardedAvailable } from '@/store/ads';
import { purchasesAvailable, usePremium, useSharesLeft } from '@/store/premium';
import { saveViewToPhotos, shareViewAsImage } from '@/services/share';
import { useToast } from '@/store/toast';
import { SHARES_PER_AD } from '@/premium/features';
import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SHARE_WIDTH, ShareCard, type ShareEntry } from './ShareCard';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  question?: string;
  entries: ShareEntry[];
};

/** Preview of the share image with a button that renders it to PNG and opens the share sheet. */
export function ShareSheet({ visible, onClose, title, subtitle, question, entries }: Props) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const toast = useToast((s) => s.show);
  const fmt = useNumberFormat();
  const sharesLeft = useSharesLeft();
  const rewardedAvailable = useRewardedAvailable();
  const recordShare = usePremium((s) => s.recordShare);
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(SHARE_WIDTH, width - spacing.lg * 2);

  // No Premium on sale: a rewarded ad buys more shares instead of the paywall.
  const adUnlock = sharesLeft === 0 && !purchasesAvailable() && rewardedConfigured();

  /** Spends one allowance share on `action`; at zero, offers the rewarded ad or the paywall instead. */
  const guarded = async (action: () => Promise<boolean>) => {
    if (adUnlock) {
      setBusy(true);
      const outcome = await useAds.getState().watchForShares();
      setBusy(false);
      if (outcome === 'earned') toast(t('ads.sharesUnlocked', { n: fmt(SHARES_PER_AD) }));
      else toast(t(outcome === 'closed' ? 'ads.notFinished' : 'ads.unavailable'));
      return;
    }
    if (sharesLeft === 0) {
      onClose();
      router.push({ pathname: '/paywall', params: { reason: 'share' } });
      return;
    }
    setBusy(true);
    const done = await action();
    setBusy(false);
    if (done) {
      if (sharesLeft !== null) recordShare();
      onClose();
    }
  };

  const share = () =>
    guarded(async () => {
      const result = await shareViewAsImage(ref, t('share.dialogTitle'));
      if (result === 'unavailable') toast(t('share.unavailable'));
      else if (result === 'failed') toast(t('share.failed'));
      return result === 'shared';
    });

  const save = () =>
    guarded(async () => {
      const result = await saveViewToPhotos(ref);
      if (result === 'saved') toast(t('share.saved'));
      else if (result === 'denied') toast(t('share.saveDenied'));
      else if (result === 'unavailable') toast(t('share.unavailable'));
      else toast(t('share.failed'));
      return result === 'saved';
    });

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('share.title')} closeLabel={t('common.cancel')} testID="share-sheet">
      <ScrollView contentContainerStyle={styles.preview} horizontal={false}>
        <ShareCard
          ref={ref}
          appName={t('appName')}
          title={title}
          subtitle={subtitle}
          question={question}
          entries={entries}
          reversedLabel={t('card.reversed')}
          footer={t('disclaimer.short')}
          lang={lang}
          width={cardWidth}
        />
      </ScrollView>
      {sharesLeft !== null ? (
        <AppText variant="caption" tone="textMuted" center testID="share-allowance">
          {sharesLeft > 0 ? t('premium.sharesLeft', { n: fmt(sharesLeft) }) : t('premium.sharesUsedUp')}
        </AppText>
      ) : null}
      <Button
        label={adUnlock ? t('ads.watchForShares', { n: fmt(SHARES_PER_AD) }) : sharesLeft === 0 ? t('premium.unlockSharing') : t('share.button')}
        onPress={share}
        disabled={adUnlock && !rewardedAvailable}
        loading={busy}
        testID="share-confirm"
      />
      {!adUnlock ? (
        <Button label={t('share.save')} variant="secondary" onPress={save} loading={busy} testID="share-save" />
      ) : null}
      <Button label={t('common.cancel')} variant="ghost" onPress={onClose} testID="share-cancel" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: spacing.sm },
});
