import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TarotCard } from '@/data/types';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';
import { CardFace } from './art/CardFace';

export type ShareEntry = { position: string | null; card: TarotCard; reversed: boolean };

type Props = {
  appName: string;
  title: string;
  subtitle: string;
  question?: string;
  entries: ShareEntry[];
  reversedLabel: string;
  footer: string;
  lang: 'en' | 'my';
  /** Rendered width in dp (the PNG is captured at the device's pixel density). */
  width?: number;
};

export const SHARE_WIDTH = 360;

/** The image people share: a branded summary of a reading (rendered to PNG by view-shot). */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { appName, title, subtitle, question, entries, reversedLabel, footer, lang, width = SHARE_WIDTH },
  ref,
) {
  const perRow = entries.length <= 3 ? entries.length : 5;
  const inner = width - spacing.md * 2 - spacing.lg * 2;
  const cardWidth = Math.min(96, (inner - spacing.sm * (perRow - 1)) / perRow);
  return (
    <View ref={ref} collapsable={false} style={[styles.root, { width }]} testID="share-card">
      <View style={styles.frame}>
        <AppText variant="caption" bold center style={styles.gold}>
          {appName}
        </AppText>
        <AppText variant="heading" center style={styles.ivory}>
          {title}
        </AppText>
        <AppText variant="caption" center style={styles.muted}>
          {subtitle}
        </AppText>
        {question ? (
          <AppText variant="caption" center style={styles.ivory}>
            “{question}”
          </AppText>
        ) : null}
        <View style={styles.cards}>
          {entries.map((e, i) => (
            <CardFace key={`${e.card.id}-${i}`} card={e.card} width={cardWidth} reversed={e.reversed} showName={false} />
          ))}
        </View>
        <View style={styles.list}>
          {entries.map((e, i) => (
            <AppText key={`${e.card.id}-${i}`} variant="caption" style={styles.ivory}>
              {e.position ? `${e.position} · ` : ''}
              {e.card[lang].name}
              {e.reversed ? ` (${reversedLabel})` : ''}
            </AppText>
          ))}
        </View>
        <AppText variant="caption" center style={styles.muted}>
          {footer}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { backgroundColor: palette.indigo, padding: spacing.md },
  frame: {
    borderWidth: 1.5,
    borderColor: palette.gold,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: palette.midnight,
  },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  list: { gap: 2 },
  gold: { color: palette.gold },
  ivory: { color: palette.ivory },
  muted: { color: '#C9BFD9' },
});
