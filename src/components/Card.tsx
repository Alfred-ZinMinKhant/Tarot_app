import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

type Props = { children: ReactNode; style?: ViewStyle; testID?: string };

export function Card({ children, style, testID }: Props) {
  const { colors } = useAppTheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
});
