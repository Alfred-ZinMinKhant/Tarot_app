import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/store/toast';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';

const VISIBLE_MS = 3500;

/** Renders the current toast above the tab bar. Mounted once in the root layout. */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [current, hide]);

  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 88 }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(150)}
        style={[styles.toast, { backgroundColor: colors.text }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        testID="toast"
      >
        <AppText style={[styles.text, { color: colors.background }]}>{current.text}</AppText>
        {current.actionLabel && current.onAction ? (
          <Pressable
            onPress={() => {
              current.onAction?.();
              hide();
            }}
            accessibilityRole="button"
            accessibilityLabel={current.actionLabel}
            hitSlop={8}
            style={styles.action}
            testID="toast-action"
          >
            <AppText bold style={{ color: colors.background }}>
              {current.actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: MIN_TAP,
    maxWidth: 560,
    width: '100%',
  },
  text: { flex: 1 },
  action: { minHeight: MIN_TAP, justifyContent: 'center' },
});
