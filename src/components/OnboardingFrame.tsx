import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { Button } from './Button';
import { Screen } from './Screen';

type Props = {
  step: number;
  total: number;
  title: string;
  body: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onSkip?: () => void;
  testID?: string;
};

export function OnboardingFrame({ step, total, title, body, children, primaryLabel, onPrimary, onSkip, testID }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Screen testID={testID} contentStyle={styles.content}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('onboarding.stepA11y', { current: step, total })}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i + 1 === step ? colors.primary : colors.border }]}
          />
        ))}
      </View>
      <View style={styles.body}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        <AppText tone="textMuted">{body}</AppText>
        {children}
      </View>
      <View style={styles.actions}>
        <Button label={primaryLabel} onPress={onPrimary} testID="onboarding-next" />
        {onSkip ? <Button label={t('common.skip')} variant="ghost" onPress={onSkip} testID="onboarding-skip" /> : null}
        <AppText variant="caption" tone="textMuted" center>
          {t('disclaimer.short')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'center', paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  body: { gap: spacing.lg, paddingTop: spacing.xl },
  actions: { gap: spacing.md },
});
