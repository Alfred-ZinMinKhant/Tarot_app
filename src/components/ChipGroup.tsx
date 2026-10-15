import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/spacing';

import { Chip } from './Chip';

export type ChipOption<T extends string> = { value: T; label: string; accessibilityLabel?: string };

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
};

/** Single-select row of chips that wraps onto new lines on narrow screens. */
export function ChipGroup<T extends string>({ options, value, onChange, testIDPrefix }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          accessibilityLabel={o.accessibilityLabel}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
          testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
