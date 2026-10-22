import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/spacing';

import { Chip } from './Chip';

export type ChipOption<T extends string> = { value: T; label: string; accessibilityLabel?: string; accent?: string };

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
  /** Keep chips on one line and scroll horizontally (for filter bars). */
  scroll?: boolean;
  accessibilityLabel?: string;
};

/** Single-select row of chips that wraps onto new lines on narrow screens. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
  scroll = false,
  accessibilityLabel,
}: Props<T>) {
  const chips = options.map((o) => (
    <Chip
      key={o.value}
      label={o.label}
      accessibilityLabel={o.accessibilityLabel}
      selected={o.value === value}
      accent={o.accent}
      onPress={() => onChange(o.value)}
      testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
    />
  ));
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scroll: { flexGrow: 0, flexShrink: 0 },
  scrollRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
});
