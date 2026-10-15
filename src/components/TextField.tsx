import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useLanguage } from '@/hooks/useLanguage';
import { containsMyanmar } from '@/utils/myanmar';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamilyFor, LINE_HEIGHT, scriptForLanguage } from '@/theme/typography';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style' | 'onChange'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
};

/**
 * Text input that is safe for Burmese: autocorrect and spell-check off (they mangle Myanmar
 * syllables on many keyboards), a Myanmar font whenever the text or UI is Burmese, and a tall
 * enough line height that stacked vowels aren't clipped.
 */
export function TextField({ label, hint, value, onChangeText, multiline, ...rest }: Props) {
  const theme = useAppTheme();
  const lang = useLanguage();
  const script = containsMyanmar(value) ? 'myanmar' : scriptForLanguage(lang);
  const size = theme.size('body');
  return (
    <View style={styles.root}>
      <AppText variant="label" bold>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        spellCheck={false}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            fontFamily: fontFamilyFor(script, false, theme.myanmarFont),
            fontSize: size,
            lineHeight: Math.round(size * LINE_HEIGHT[script]),
          },
        ]}
        {...rest}
      />
      {hint ? (
        <AppText variant="caption" tone="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  multiline: { minHeight: 120 },
});
