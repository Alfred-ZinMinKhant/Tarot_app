import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TarotCard as Card } from '@/data/types';

import { CardBack } from './art/CardBack';
import { CARD_ASPECT } from './art/cardBackSvg';
import { CardFace } from './art/CardFace';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Props = {
  card: Card;
  width: number;
  reversed?: boolean;
  /** Face up when true; flips with an animation when it changes. */
  revealed: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

export const FLIP_MS = 520;

/** A card that flips from its back to its face (3D rotate around the Y axis). */
export function TarotCard({ card, width, reversed = false, revealed, onPress, accessibilityLabel, testID }: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(revealed ? 1 : 0);
  const height = width / CARD_ASPECT;

  useEffect(() => {
    progress.value = reduceMotion ? (revealed ? 1 : 0) : withTiming(revealed ? 1 : 0, { duration: FLIP_MS });
  }, [revealed, reduceMotion, progress]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: revealed }}
      testID={testID}
      style={{ width, height }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, backStyle]} pointerEvents="none">
        <CardBack width={width} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, frontStyle]} pointerEvents="none">
        {revealed ? <CardFace card={card} width={width} reversed={reversed} /> : <View />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: 'hidden' },
});
