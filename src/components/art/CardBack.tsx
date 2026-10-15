import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { CARD_ASPECT, CARD_BACK_SVG } from './cardBackSvg';

type Props = { width: number; accessibilityLabel?: string; testID?: string };

/** The original indigo-and-gold card back (lotus, kanok scrolls, crescent moon). */
export function CardBack({ width, accessibilityLabel, testID }: Props) {
  const height = width / CARD_ASPECT;
  return (
    <View
      style={[styles.shadow, { width, height, borderRadius: width * 0.06 }]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <SvgXml xml={CARD_BACK_SVG} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
