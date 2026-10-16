import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useLanguage } from '@/hooks/useLanguage';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamilyFor, scriptForLanguage } from '@/theme/typography';

import { Icon } from './Icon';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  clearLabel: string;
  testID: string;
};

/** Pill-shaped search input with a clear button. The clear button's testID is `${testID}-clear`. */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, clearLabel, testID }: Props) {
  const theme = useAppTheme();
  const lang = useLanguage();
  const inputScript = scriptForLanguage(lang);
  return (
    <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Icon name="search" size={20} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        returnKeyType="search"
        testID={testID}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            fontFamily: fontFamilyFor(inputScript, false, theme.myanmarFont),
            fontSize: theme.size('body'),
          },
        ]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={8}
          style={styles.clear}
          testID={`${testID}-clear`}
        >
          <Icon name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TAP + 4,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    // The pill border already shows focus; drop the browser's default outline on web.
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  clear: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
});
