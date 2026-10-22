import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from './cardBackSvg';

// Rendered from the SVG source by `npm run render:card-back`. A bitmap is far cheaper than building
// the SVG tree for every card: the Celtic Cross mounts over thirty backs at once.
const CARD_BACK_IMAGE = require('../../../assets/images/card-back.png');

type Props = {
  width: number;
  /** Skip the drop shadow; used where many backs are on screen at once (Android draws each shadow offscreen). */
  flat?: boolean;
  /** Colour wash over the back (the reading topic's accent). */
  tint?: string;
  accessibilityLabel?: string;
  testID?: string;
};

/** The original indigo-and-gold card back (lotus, kanok scrolls, crescent moon). */
export const CardBack = memo(function CardBack({ width, flat, tint, accessibilityLabel, testID }: Props) {
  const height = width / CARD_ASPECT;
  return (
    <View
      style={[styles.base, !flat && styles.shadow, { width, height, borderRadius: width * 0.06 }]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Image source={CARD_BACK_IMAGE} style={{ width, height }} resizeMode="cover" />
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.22 }]} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
