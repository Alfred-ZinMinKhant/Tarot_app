import { Children, isValidElement, type ReactNode, useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/ThemeContext';
import type { ColorTokens } from '@/theme/colors';
import { fontFamilyFor, LINE_HEIGHT, scriptForLanguage, type TextVariant } from '@/theme/typography';
import { breakBurmese, containsMyanmar } from '@/utils/myanmar';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  bold?: boolean;
  tone?: keyof Pick<ColorTokens, 'text' | 'textMuted' | 'primary' | 'accent' | 'danger' | 'onPrimary' | 'onAccent'>;
  center?: boolean;
  /** Skip automatic syllable line-break hints for Burmese text. */
  noBreak?: boolean;
  children?: ReactNode;
};

function collectText(children: ReactNode): string {
  let text = '';
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') text += String(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) text += collectText(child.props.children);
  });
  return text;
}

/**
 * The only text primitive screens should use. It picks the bundled Myanmar
 * font + tall line-height whenever the UI language is Burmese *or* the string
 * contains Burmese characters (so endonyms like "မြန်မာ" render correctly in
 * English mode and never fall back to a possibly-Zawgyi system font), and it
 * inserts syllable break hints so Burmese wraps cleanly.
 */
export function AppText({
  variant = 'body',
  bold,
  tone = 'text',
  center,
  noBreak,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useAppTheme();
  const plain = useMemo(() => collectText(children), [children]);
  const script = scriptForLanguage(theme.language) === 'myanmar' || containsMyanmar(plain) ? 'myanmar' : 'latin';
  const isBold = bold ?? (variant === 'display' || variant === 'title' || variant === 'heading');
  const fontSize = theme.size(variant);
  const content = useMemo(
    () =>
      noBreak || script === 'latin'
        ? children
        : Children.map(children, (c) => (typeof c === 'string' ? breakBurmese(c) : c)),
    [children, noBreak, script],
  );

  return (
    <Text
      maxFontSizeMultiplier={2}
      accessibilityLabel={rest.accessibilityLabel ?? (script === 'myanmar' && plain ? plain : undefined)}
      {...rest}
      style={[
        {
          color: theme.colors[tone],
          fontSize,
          lineHeight: Math.round(fontSize * LINE_HEIGHT[script]),
          fontFamily: fontFamilyFor(script, isBold, theme.myanmarFont),
          // Custom Myanmar fonts carry their own bold face; synthetic bold on top looks smeared.
          fontWeight: script === 'myanmar' ? 'normal' : isBold ? '700' : '400',
        },
        center && styles.center,
        style,
      ]}
    >
      {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
