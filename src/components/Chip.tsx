import { Pressable, StyleSheet } from 'react-native';

import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';

type Props = {
  label: string;
  selected?: boolean;
  /** Fill colour when selected, instead of the primary colour (reading topic accent). */
  accent?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

export function Chip({ label, selected = false, accent, onPress, accessibilityLabel, testID }: Props) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? (accent ?? colors.primary) : colors.surfaceAlt,
          borderColor: selected ? (accent ?? colors.primary) : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <AppText variant="label" bold={selected} tone={selected ? 'onPrimary' : 'text'} center>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TAP,
    minWidth: MIN_TAP,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    flexShrink: 1,
  },
});
