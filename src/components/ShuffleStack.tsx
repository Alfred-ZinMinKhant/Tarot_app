import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CardBack } from './art/CardBack';
import { CARD_ASPECT } from './art/cardBackSvg';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Props = { width: number; onPress?: () => void; accessibilityLabel?: string; testID?: string };

const LAYERS = 5;

function Layer({ index, cardWidth }: { index: number; cardWidth: number }) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    const dir = index % 2 ? 1 : -1;
    t.value = withRepeat(
      withSequence(
        withTiming(dir, { duration: 180 + index * 40 }),
        withTiming(-dir * 0.4, { duration: 180 + index * 30 }),
        withTiming(0, { duration: 160 }),
      ),
      -1,
    );
  }, [index, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * cardWidth * 0.55 },
      { translateY: -index * 3 },
      { rotate: `${t.value * 8}deg` },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <CardBack width={cardWidth} />
    </Animated.View>
  );
}

/** A small stack of card backs riffling side to side while the deck is shuffled. */
export function ShuffleStack({ width, onPress, accessibilityLabel, testID }: Props) {
  const cardWidth = Math.min(140, width * 0.36);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.wrap}
    >
      <View style={{ width: cardWidth, height: cardWidth / CARD_ASPECT }}>
        {Array.from({ length: LAYERS }, (_, i) => (
          <Layer key={i} index={i} cardWidth={cardWidth} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
});
