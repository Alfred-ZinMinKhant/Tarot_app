import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = { icon: IconName; title: string; body?: string; testID?: string };

export function EmptyState({ icon, title, body, testID }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.root} testID={testID}>
      <Icon name={icon} size={48} color={colors.primary} />
      <AppText variant="heading" center>
        {title}
      </AppText>
      {body ? (
        <AppText tone="textMuted" center>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md },
});
