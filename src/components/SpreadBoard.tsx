import { StyleSheet, View } from 'react-native';

import { getCard } from '@/data/cards';
import type { DrawnCard, Spread } from '@/engine';
import { layoutSize } from '@/engine';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import type { Language } from '@/i18n/languages';
import { radius } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { CARD_ASPECT } from './art/cardBackSvg';
import { PositionGlyph } from './art/PositionGlyph';
import { TarotCard } from './TarotCard';

type Props = {
  spread: Spread;
  /** Drawn card per position (undefined until picked). */
  cards: readonly (DrawnCard | undefined)[];
  revealed: readonly boolean[];
  onReveal?: (index: number) => void;
  width: number;
  lang: Language;
  slotLabel: (index: number) => string;
  revealLabel: (index: number) => string;
  /** Announced for a face-up card: its position, name and whether it fell reversed. */
  faceLabel: (index: number, cardName: string, reversed: boolean) => string;
  /** Colour wash over face-down cards (reading topic accent). */
  tint?: string;
};

const LABEL_MIN_WIDTH = 56; // narrower slots show the number only
const GAP = 0.12; // gap between cards, as a fraction of card width

/** Lays out a spread's positions (empty slots, face-down or face-up cards) to fit the given width. */
export function SpreadBoard({
  spread,
  cards,
  revealed,
  onReveal,
  width,
  lang,
  slotLabel,
  revealLabel,
  faceLabel,
  tint,
}: Props) {
  const { colors } = useAppTheme();
  const fmt = useNumberFormat();
  const size = layoutSize(spread);
  const maxCard = spread.cardCount === 1 ? 180 : 132;
  const cardWidth = Math.min(maxCard, width / (size.width + GAP * (size.width - 1)));
  const cardHeight = cardWidth / CARD_ASPECT;
  const stepX = cardWidth * (1 + GAP);
  // Every position is named under its card (two lines when the cards are narrow).
  const showLabels = cardWidth >= LABEL_MIN_WIDTH && spread.cardCount > 1;
  const labelLines = 2;
  const labelHeight = showLabels ? labelLines * 16 + 4 : 0;
  const stepY = cardHeight + labelHeight + cardWidth * GAP;
  const boardWidth = (size.width - 1) * stepX + cardWidth;
  const boardHeight = (size.height - 1) * stepY + cardHeight + labelHeight;

  return (
    <View style={[styles.board, { width: boardWidth, height: boardHeight }]} testID="spread-board">
      {spread.positions.map((p, i) => {
        const drawn = cards[i];
        const card = drawn ? getCard(drawn.cardId) : undefined;
        const left = p.x * stepX;
        const top = p.y * stepY;
        return (
          <View
            key={p.id}
            style={[
              styles.slot,
              { left, top, width: cardWidth, height: cardHeight, zIndex: p.rotate ? 2 : 1 },
            ]}
          >
            <View
              style={[styles.fill, p.rotate ? { transform: [{ rotate: `${p.rotate}deg` }] } : null]}
            >
              {card && drawn ? (
                <TarotCard
                  card={card}
                  width={cardWidth}
                  reversed={drawn.reversed}
                  revealed={!!revealed[i]}
                  tint={tint}
                  onPress={revealed[i] || !onReveal ? undefined : () => onReveal(i)}
                  accessibilityLabel={
                    revealed[i] ? faceLabel(i, card[lang].name, drawn.reversed) : revealLabel(i)
                  }
                  testID={`spread-card-${i}`}
                />
              ) : (
                <View
                  accessible
                  accessibilityLabel={slotLabel(i)}
                  style={[
                    styles.empty,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: cardWidth * 0.06,
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.frame,
                      {
                        borderColor: colors.border,
                        borderRadius: cardWidth * 0.035,
                        margin: cardWidth * 0.05,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.gem,
                      { backgroundColor: colors.primary, top: cardWidth * 0.05 - 3 },
                    ]}
                    pointerEvents="none"
                  />
                  <View
                    style={[
                      styles.gem,
                      { backgroundColor: colors.primary, bottom: cardWidth * 0.05 - 3 },
                    ]}
                    pointerEvents="none"
                  />
                  <View
                    style={[
                      styles.ring,
                      {
                        width: cardWidth * 0.62,
                        height: cardWidth * 0.62,
                        borderColor: colors.primary,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <PositionGlyph id={p.id} size={cardWidth * 0.36} color={colors.primary} />
                  </View>
                </View>
              )}
            </View>
            {showLabels && !p.rotate ? (
              <View
                style={[
                  styles.label,
                  {
                    top: cardHeight + 4,
                    left: (-cardWidth * GAP) / 2,
                    width: cardWidth * (1 + GAP),
                  },
                ]}
                pointerEvents="none"
              >
                <AppText
                  variant="caption"
                  tone={revealed[i] ? 'text' : 'textMuted'}
                  bold={!!revealed[i]}
                  center
                  numberOfLines={labelLines}
                >
                  {p[lang].name}
                </AppText>
              </View>
            ) : null}
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.primary },
                // A sideways card's corner is not where the unrotated slot's corner is.
                p.rotate
                  ? {
                      left: (cardWidth - cardHeight) / 2 - 8,
                      top: (cardHeight - cardWidth) / 2 - 8,
                    }
                  : null,
              ]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <AppText variant="caption" bold tone="onPrimary" center>
                {fmt(i + 1)}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center' },
  slot: { position: 'absolute' },
  fill: { flex: 1 },
  label: { position: 'absolute', alignItems: 'center' },
  empty: { flex: 1, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gem: { position: 'absolute', width: 6, height: 6, transform: [{ rotate: '45deg' }] },
  ring: { borderWidth: 1.2, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -8,
    left: -8,
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
