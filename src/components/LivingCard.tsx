import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme/colors';

import { CARD_ASPECT } from './art/cardBackSvg';

type Props = { width: number; children: ReactNode };

const SPARKLES = [
  { x: 0.14, delay: 0, size: 5, ms: 5200 },
  { x: 0.32, delay: 1500, size: 4, ms: 6100 },
  { x: 0.5, delay: 600, size: 6, ms: 5600 },
  { x: 0.68, delay: 2400, size: 4, ms: 6400 },
  { x: 0.84, delay: 900, size: 5, ms: 5000 },
  { x: 0.24, delay: 3300, size: 3, ms: 5800 },
  { x: 0.74, delay: 3900, size: 3, ms: 6200 },
] as const;

/** Reanimated loops never finish, so tests render the card still. */
const ANIMATE = process.env.NODE_ENV !== 'test';

function Sparkle({ x, delay, size, ms, height, width }: (typeof SPARKLES)[number] & { height: number; width: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, delay, ms]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateY: -t.value * height * 0.7 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sparkle,
        { left: x * width, bottom: height * 0.08, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

/**
 * Gives a card a living feel with nothing but code: it breathes and sways, a soft light sweeps
 * across it, and golden sparkles drift upward. Everything stops when the user asks for reduced motion.
 */
export function LivingCard({ width, children }: Props) {
  const reduce = useReduceMotion();
  const height = width / CARD_ASPECT;
  const breathe = useSharedValue(0);
  const sweep = useSharedValue(0);
  const on = ANIMATE && !reduce;

  useEffect(() => {
    if (!on) return;
    breathe.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true);
    sweep.value = withRepeat(
      withSequence(withTiming(0, { duration: 3200 }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
  }, [on, breathe, sweep]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { scale: 1 + breathe.value * 0.025 },
      { translateY: -breathe.value * 3 },
      { rotateY: `${(breathe.value - 0.5) * 6}deg` },
      { rotateX: `${(0.5 - breathe.value) * 2}deg` },
    ],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? 0.22 : 0,
    transform: [{ translateX: -width * 0.6 + sweep.value * width * 1.6 }, { rotate: '18deg' }],
  }));

  if (!on) return <View style={{ width, height }}>{children}</View>;
  return (
    <Animated.View style={[{ width, height }, cardStyle]} testID="living-card">
      {children}
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: width * 0.06 }]} pointerEvents="none">
        <Animated.View style={[styles.band, { width: width * 0.28, height: height * 1.5, top: -height * 0.25 }, sweepStyle]} />
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} height={height} width={width} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  band: { position: 'absolute', backgroundColor: '#FFFFFF' },
  sparkle: { position: 'absolute', backgroundColor: palette.gold },
});
