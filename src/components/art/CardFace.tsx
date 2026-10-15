import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { toRoman } from '@/data/cards';
import { CARD_IMAGES, CARD_THUMBS } from '@/data/cardImages';
import type { TarotCard } from '@/data/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { palette } from '@/theme/colors';

import { AppText } from '../AppText';
import { CARD_ASPECT } from './cardBackSvg';
import { SuitGlyph } from './SuitGlyph';

type Props = {
  card: TarotCard;
  width: number;
  reversed?: boolean;
  /** Use the 900px image instead of the 300px thumbnail. */
  large?: boolean;
  /** Print the card name on the typographic face (off when a caption is shown beside it). */
  showName?: boolean;
  testID?: string;
};

/**
 * The front of a card. Shows the bundled 1909 illustration when it is available; otherwise an
 * original typographic face (number, suit glyph and name) in the deck's ivory-and-gold style.
 */
export function CardFace({ card, width, reversed = false, large = false, showName = true, testID }: Props) {
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const height = width / CARD_ASPECT;
  const name = card[lang].name;
  const image = (large ? CARD_IMAGES[card.id] : undefined) ?? CARD_THUMBS[card.id];
  const label = reversed ? `${name}, ${lang === 'my' ? 'ပြောင်းပြန်' : 'reversed'}` : name;
  const numeral =
    card.arcana === 'major' ? toRoman(card.number) : card.number >= 2 && card.number <= 10 ? fmt(card.number) : '';
  const compact = width < 120;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.frame,
        { width, height, borderRadius: width * 0.06, transform: reversed ? [{ rotate: '180deg' }] : [] },
      ]}
    >
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.paper, { margin: width * 0.04, borderRadius: width * 0.04, padding: width * 0.05 }]}>
          <AppText
            variant={compact ? 'caption' : 'heading'}
            center
            style={styles.ink}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {numeral || ' '}
          </AppText>
          <View style={styles.glyph}>
            <SuitGlyph suit={card.suit} size={width * 0.42} color={palette.goldDeep} />
          </View>
          {showName && width >= 72 ? (
            <AppText
              variant={compact ? 'caption' : 'label'}
              bold
              center
              numberOfLines={compact ? 3 : 2}
              style={styles.ink}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {name}
            </AppText>
          ) : (
            <View />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: palette.gold,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  paper: {
    flex: 1,
    backgroundColor: palette.ivory,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.goldDeep,
  },
  glyph: { flex: 1, justifyContent: 'center' },
  ink: { color: palette.indigo },
});
