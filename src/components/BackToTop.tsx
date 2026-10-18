import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { Icon } from './Icon';

/** Round "back to top" button, floated over the bottom-right of a long screen. */
export function BackToTop({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('common.backToTop')}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
        testID="back-to-top"
      >
        <Icon name="up" color={colors.text} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  button: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
