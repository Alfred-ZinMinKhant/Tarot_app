import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: ReactNode;
  testID?: string;
};

/** Modal sheet that slides up from the bottom; tapping the backdrop closes it. */
export function BottomSheet({ visible, onClose, title, closeLabel, children, testID }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <Animated.View
          entering={SlideInDown.duration(220)}
          accessibilityViewIsModal
          testID={testID}
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title ? (
            <AppText variant="heading" accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
});
