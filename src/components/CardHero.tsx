import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { usePortraitAccess } from '@/hooks/usePortraitAccess';
import { hasPortrait, portraitUri } from '@/services/portraits';
import { usePortraitPreview } from '@/store/portraitPreview';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { LivingCard } from './LivingCard';
import { CARD_ASPECT } from './art/cardBackSvg';

const PREVIEW_MS = 4000;

type Props = { cardId: string; width: number; reversed?: boolean; children: ReactNode };

function Clip({
  uri,
  width,
  reversed,
  loop,
  onEnd,
}: {
  uri: string;
  width: number;
  reversed: boolean;
  loop: boolean;
  onEnd?: () => void;
}) {
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
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: width * 0.06,
          overflow: 'hidden',
          transform: reversed ? [{ rotate: '180deg' }] : [],
        },
      ]}
    >
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

function PortraitUpsell() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/paywall', params: { reason: 'portraits' } })}
      accessibilityRole="button"
      accessibilityLabel={`${t('premium.portraitsHint')} ${t('premium.see')}`}
      style={[styles.upsell, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      testID="portrait-upsell"
    >
      <Icon name="lock" size={14} color={colors.primary} />
      <AppText variant="caption" tone="textMuted" style={styles.upsellText} numberOfLines={2}>
        {t('premium.portraitsHint')}
      </AppText>
      <AppText variant="caption" tone="primary" bold testID="portrait-upsell-button">
        {t('premium.see')}
      </AppText>
    </Pressable>
  );
}

/**
 * A big card with life in it. Everyone gets the code-made Living Card effect. When a moving
 * portrait clip exists for the card, Premium plays it on a loop and free users see a short preview
 * (once a day) followed by an invitation to unlock it.
 */
export function CardHero({ cardId, width, reversed = false, children }: Props) {
  const access = usePortraitAccess();
  const canPreview = usePortraitPreview((s) => s.canPreview);
  const markPreviewed = usePortraitPreview((s) => s.markPreviewed);
  // State is keyed by card id, so switching cards ignores the old card's clip without a reset effect.
  const [loaded, setLoaded] = useState<{ id: string; uri: string } | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const uri = loaded?.id === cardId ? loaded.uri : null;
  const previewDone = doneId === cardId;
  const available = hasPortrait(cardId);
  const wantsClip = available && (access === 'full' || canPreview());

  useEffect(() => {
    if (!wantsClip) return;
    let cancelled = false;
    void portraitUri(cardId).then((u) => {
      if (cancelled || !u) return;
      setLoaded({ id: cardId, uri: u });
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
  const showUpsell =
    available && access === 'preview' && (previewDone || (!canPreview() && uri === null));
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
            onEnd={access === 'preview' ? () => setDoneId(cardId) : undefined}
          />
        ) : null}
      </LivingCard>
      {showUpsell ? <PortraitUpsell /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'stretch',
  },
  upsellText: { flex: 1 },
});
