import { type Href, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TAP, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = { fallback: Href; testID?: string };

/** "‹ Back" for stack screens; goes to `fallback` when there is no history (e.g. a deep link). */
export function BackButton({ fallback, testID = 'back-button' }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      style={styles.back}
      testID={testID}
    >
      <Icon name="back" color={colors.text} />
      <AppText variant="label">{t('common.back')}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TAP, alignSelf: 'flex-start' },
});
