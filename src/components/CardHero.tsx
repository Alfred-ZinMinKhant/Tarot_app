import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { usePortraitAccess } from '@/hooks/usePortraitAccess';
import { hasPortrait, portraitUri } from '@/services/portraits';
import { usePortraitPreview } from '@/store/portraitPreview';

import { AppText } from './AppText';
import { Button } from './Button';
import { LivingCard } from './LivingCard';
import { CARD_ASPECT } from './art/cardBackSvg';

const PREVIEW_MS = 4000;

type Props = { cardId: string; width: number; reversed?: boolean; children: ReactNode };

function Clip({ uri, width, reversed, loop, onEnd }: { uri: string; width: number; reversed: boolean; loop: boolean; onEnd?: () => void }) {
  const height = width / CARD_ASPECT;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    if (loop || !onEnd) return;
    const id = setTimeout(onEnd, PREVIEW_MS);
    return () => clearTimeout(id);
  }, [loop, onEnd]);
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: width * 0.06, overflow: 'hidden', transform: reversed ? [{ rotate: '180deg' }] : [] }]}
    >
      <VideoView player={player} style={{ width, height }} contentFit="cover" nativeControls={false} />
    </View>
  );
}

/**
 * A big card with life in it. Everyone gets the code-made Living Card effect. When a moving
 * portrait clip exists for the card, Premium plays it on a loop and free users see a short preview
 * (once a day) followed by an invitation to unlock it.
 */
export function CardHero({ cardId, width, reversed = false, children }: Props) {
  const { t } = useTranslation();
  const access = usePortraitAccess();
  const canPreview = usePortraitPreview((s) => s.canPreview);
  const markPreviewed = usePortraitPreview((s) => s.markPreviewed);
  const [uri, setUri] = useState<string | null>(null);
  const [previewDone, setPreviewDone] = useState(false);
  const available = hasPortrait(cardId);
  const wantsClip = available && (access === 'full' || canPreview());

  useEffect(() => {
    setUri(null);
    setPreviewDone(false);
    if (!wantsClip) return;
    let cancelled = false;
    void portraitUri(cardId).then((u) => {
      if (cancelled || !u) return;
      setUri(u);
      if (access === 'preview') {
        markPreviewed();
        track('portrait_preview', { card: cardId });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, wantsClip]);

  const playing = uri !== null && !previewDone;
  const showUpsell = available && access === 'preview' && (previewDone || (!canPreview() && uri === null));
  return (
    <View style={styles.wrap}>
      <LivingCard width={width}>
        {children}
        {playing && uri ? (
          <Clip
            uri={uri}
            width={width}
            reversed={reversed}
            loop={access === 'full'}
            onEnd={access === 'preview' ? () => setPreviewDone(true) : undefined}
          />
        ) : null}
      </LivingCard>
      {showUpsell ? (
        <View style={styles.upsell} testID="portrait-upsell">
          <AppText variant="caption" tone="textMuted" center>
            {t('premium.portraitsHint')}
          </AppText>
          <Button
            label={t('premium.see')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/paywall', params: { reason: 'portraits' } })}
            testID="portrait-upsell-button"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  upsell: { alignItems: 'center', gap: 4 },
});
