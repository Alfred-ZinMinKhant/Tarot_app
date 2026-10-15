import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, EmptyState, Header, Screen } from '@/components';
import { getLesson, LESSONS, nextLesson } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const toast = useToast((s) => s.show);
  const read = useSettings((s) => s.lessonsRead);
  const markLessonRead = useSettings((s) => s.markLessonRead);
  const lesson = getLesson(id);

  if (!lesson) {
    return (
      <Screen testID="screen-lesson-missing">
        <BackButton fallback="/learn" />
        <EmptyState icon="learn" title={t('learn.notFound')} />
      </Screen>
    );
  }

  const text = lesson[lang];
  const index = LESSONS.indexOf(lesson);
  const next = nextLesson(lesson.id);
  const finished = read.includes(lesson.id);

  const finish = () => {
    markLessonRead(lesson.id);
    if (next) {
      toast(t('learn.finishedToast'));
      router.replace({ pathname: '/learn/[id]', params: { id: next.id } });
    } else {
      toast(t('learn.allDone'));
      if (router.canGoBack()) router.back();
      else router.replace('/learn');
    }
  };

  return (
    <Screen testID={`screen-lesson-${lesson.id}`}>
      <BackButton fallback="/learn" />
      <Header
        title={text.title}
        subtitle={t('learn.lessonOf', { n: fmt(index + 1), total: fmt(LESSONS.length) })}
      />
      <AppText tone="textMuted">{text.summary}</AppText>
      {text.sections.map((s) => (
        <Card key={s.heading}>
          <AppText variant="heading" accessibilityRole="header">
            {s.heading}
          </AppText>
          <AppText>{s.body}</AppText>
        </Card>
      ))}
      <View style={styles.actions}>
        {next ? (
          <Button
            label={finished ? t('learn.next', { title: next[lang].title }) : t('learn.finishNext')}
            onPress={finish}
            testID="lesson-finish"
          />
        ) : (
          <Button label={finished ? t('learn.backToList') : t('learn.finish')} onPress={finish} testID="lesson-finish" />
        )}
      </View>
      <AppText variant="caption" tone="textMuted" center>
        {t('disclaimer.short')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
