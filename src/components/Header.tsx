import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';

type Props = { title: string; subtitle?: string; right?: ReactNode };

export function Header({ title, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText tone="textMuted">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
});
