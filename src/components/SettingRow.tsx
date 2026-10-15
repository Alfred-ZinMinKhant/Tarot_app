import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { MIN_TAP, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';

type Props = {
  label: string;
  description?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  children?: ReactNode;
  testID?: string;
};

/** A labelled setting: either a switch (value/onValueChange) or custom controls below the label. */
export function SettingRow({ label, description, value, onValueChange, children, testID }: Props) {
  const { colors } = useAppTheme();
  const isSwitch = onValueChange !== undefined;
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="label" bold>
            {label}
          </AppText>
          {description ? (
            <AppText variant="caption" tone="textMuted">
              {description}
            </AppText>
          ) : null}
        </View>
        {isSwitch ? (
          <Switch
            value={!!value}
            onValueChange={onValueChange}
            accessibilityLabel={label}
            testID={testID}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.surface}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, minHeight: MIN_TAP, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
