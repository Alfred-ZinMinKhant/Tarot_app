import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { type Topic, TOPICS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamilyFor, scriptForLanguage } from '@/theme/typography';

import { AppText } from '../AppText';
import { Button } from '../Button';
import { ChipGroup } from '../ChipGroup';

type Props = {
  topic: Topic;
  onTopic: (topic: Topic) => void;
  question: string;
  onQuestion: (question: string) => void;
  onStart: () => void;
};

/** Reading setup: pick a topic, optionally type a question, then start. */
export function SetupForm({ topic, onTopic, question, onQuestion, onStart }: Props) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const theme = useAppTheme();
  const inputScript = scriptForLanguage(lang);
  return (
    <>
      <View style={styles.section}>
        <AppText variant="heading">{t('reading.topicTitle')}</AppText>
        <ChipGroup<Topic>
          testIDPrefix="topic"
          value={topic}
          onChange={onTopic}
          options={TOPICS.map((value) => ({ value, label: t(`reading.topics.${value}`) }))}
        />
      </View>
      <View style={styles.section}>
        <AppText variant="label" bold>
          {t('reading.questionLabel')}
        </AppText>
        <TextInput
          value={question}
          onChangeText={onQuestion}
          placeholder={t('reading.questionPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={t('reading.questionLabel')}
          multiline
          maxLength={300}
          autoCorrect={false}
          autoCapitalize="sentences"
          spellCheck={false}
          textAlignVertical="top"
          testID="reading-question-input"
          style={[
            styles.question,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              fontFamily: fontFamilyFor(inputScript, false, theme.myanmarFont),
              fontSize: theme.size('body'),
            },
          ]}
        />
        <AppText variant="caption" tone="textMuted">
          {t('reading.questionHint')}
        </AppText>
      </View>
      <Button label={t('reading.start')} onPress={onStart} testID="reading-start" />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  question: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
