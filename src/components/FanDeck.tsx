import { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CardBack } from './art/CardBack';
import { CARD_ASPECT } from './art/cardBackSvg';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Props = {
  /** Number of face-down cards in the fan. */
  count: number;
  /** Indices (0..count-1) already taken. */
  picked: readonly number[];
  onPick: (index: number) => void;
  width: number;
  disabled?: boolean;
  cardLabel: (index: number) => string;
  /** Colour wash over the card backs (reading topic accent). */
  tint?: string;
};

const MAX_ANGLE = 28;
/** How far the outermost cards dip below the centre ones. */
const ARC_DROP = 26;

const FanCard = memo(function FanCard({
  index,
  count,
  width,
  cardWidth,
  cardHeight,
  picked,
  disabled,
  onPick,
  label,
  tint,
}: {
  index: number;
  count: number;
  width: number;
  cardWidth: number;
  cardHeight: number;
  picked: boolean;
  disabled: boolean;
  onPick: (i: number) => void;
  label: string;
  tint?: string;
}) {
  const reduceMotion = useReduceMotion();
  const lift = useSharedValue(picked ? 1 : 0);
  useEffect(() => {
    lift.value = reduceMotion ? (picked ? 1 : 0) : withTiming(picked ? 1 : 0, { duration: 260 });
  }, [picked, reduceMotion, lift]);

  // Spread evenly across the width, tilt progressively and dip along a gentle arc.
  const t = count > 1 ? (index / (count - 1)) * 2 - 1 : 0; // -1 … 1
  const angle = t * MAX_ANGLE;
  const margin = (cardHeight / 2) * Math.sin((MAX_ANGLE * Math.PI) / 180);
  const x = margin + ((t + 1) / 2) * (width - cardWidth - 2 * margin);
  const y = ARC_DROP * t * t;

  const style = useAnimatedStyle(() => ({
    opacity: 1 - lift.value,
    transform: [{ translateY: -36 * lift.value }, { rotate: `${angle}deg` }],
  }));

  return (
    <Animated.View style={[styles.card, { left: x, top: y + 40 }, style]}>
      <Pressable
        onPress={() => onPick(index)}
        disabled={disabled || picked}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityElementsHidden={picked}
        importantForAccessibility={picked ? 'no-hide-descendants' : 'auto'}
        testID={`fan-card-${index}`}
      >
        <CardBack width={cardWidth} flat tint={tint} />
      </Pressable>
    </Animated.View>
  );
});

/** Face-down cards spread in an arc; the user taps the ones that call to them. */
export function FanDeck({ count, picked, onPick, width, disabled = false, cardLabel, tint }: Props) {
  const cardWidth = Math.max(44, Math.min(80, width / 5.4));
  const cardHeight = cardWidth / CARD_ASPECT;
  const height = cardHeight + ARC_DROP + 64;
  const taken = new Set(picked);
  // A stable handler lets the memoized fan cards skip re-rendering when only another card is picked.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  const pickCard = useCallback((i: number) => onPickRef.current(i), []);
  return (
    <View style={{ width, height }} testID="fan-deck">
      {Array.from({ length: count }, (_, i) => (
        <FanCard
          key={i}
          index={i}
          count={count}
          width={width}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          picked={taken.has(i)}
          disabled={disabled}
          onPick={pickCard}
          label={cardLabel(i)}
          tint={tint}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute' },
});
