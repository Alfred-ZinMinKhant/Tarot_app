import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, type View } from 'react-native';

import { router } from 'expo-router';

import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { usePremium, useSharesLeft } from '@/store/premium';
import { shareViewAsImage } from '@/services/share';
import { useToast } from '@/store/toast';
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
  const recordShare = usePremium((s) => s.recordShare);
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(SHARE_WIDTH, width - spacing.lg * 2);

  const share = async () => {
    if (sharesLeft === 0) {
      onClose();
      router.push({ pathname: '/paywall', params: { reason: 'share' } });
      return;
    }
    setBusy(true);
    const result = await shareViewAsImage(ref, t('share.dialogTitle'));
    setBusy(false);
    if (result === 'unavailable') toast(t('share.unavailable'));
    else if (result === 'failed') toast(t('share.failed'));
    else {
      if (sharesLeft !== null) recordShare();
      onClose();
    }
  };

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
        label={sharesLeft === 0 ? t('premium.unlockSharing') : t('share.button')}
        onPress={share}
        loading={busy}
        testID="share-confirm"
      />
      <Button label={t('common.cancel')} variant="ghost" onPress={onClose} testID="share-cancel" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: spacing.sm },
});
