import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  AppText,
  BackButton,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  Screen,
  ShareSheet,
} from '@/components';
import { CardFace } from '@/components/art';
import { getCard } from '@/data/cards';
import { getJournalRepo, type ReadingRecord } from '@/db';
import { readingText } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useJournal } from '@/store/journal';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamilyFor, scriptForLanguage } from '@/theme/typography';
import { formatDate } from '@/utils/dates';
import { positionName, readingTitle, shareEntries } from '@/utils/readings';

export default function JournalEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const theme = useAppTheme();
  const toast = useToast((s) => s.show);
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const updateNotes = useJournal((s) => s.updateNotes);
  const remove = useJournal((s) => s.remove);
  const [reading, setReading] = useState<ReadingRecord | null | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const repo = await getJournalRepo();
      const r = id ? await repo.getReading(id) : null;
      if (!alive) return;
      setReading(r);
      setNotes(r?.notes ?? '');
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (reading === undefined) return <Screen testID="screen-journal-entry-loading">{null}</Screen>;
  if (reading === null) {
    return (
      <Screen testID="screen-journal-entry-missing">
        <BackButton fallback="/journal" />
        <EmptyState icon="journal" title={t('journal.notFound')} />
      </Screen>
    );
  }

  const date = new Date(reading.createdAt);
  const dateText = formatDate(date, lang, { style: 'weekday-long', burmeseNumerals, withTime: true });
  const title = readingTitle(reading, lang, t('journal.dailyLabel'));
  const notesChanged = notes !== reading.notes;

  const saveNotes = async () => {
    await updateNotes(reading.id, notes);
    setReading({ ...reading, notes });
    toast(t('journal.notesSaved'));
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    await remove(reading.id);
    toast(t('journal.deleted'));
    if (router.canGoBack()) router.back();
    else router.replace('/journal');
  };

  return (
    <Screen testID="screen-journal-entry">
      <BackButton fallback="/journal" />
      <Header title={title} subtitle={dateText} />
      <View style={styles.chips}>
        <Chip label={t(`reading.topics.${reading.topic}`)} />
      </View>
      {reading.question ? (
        <AppText testID="journal-question">{t('reading.questionShown', { question: reading.question })}</AppText>
      ) : null}

      {reading.cards.map((c, i) => {
        const card = getCard(c.cardId);
        if (!card) return null;
        const pos = positionName(reading.spreadId, c.positionId, lang);
        return (
          <Card key={`${c.positionId}-${i}`} testID={`journal-card-${i}`}>
            <View style={styles.cardRow}>
              <CardFace card={card} width={64} reversed={c.reversed} showName={false} />
              <View style={styles.cardText}>
                {pos ? (
                  <AppText variant="caption" tone="textMuted">
                    {t('reading.positionHeading', { number: fmt(i + 1), position: pos })}
                  </AppText>
                ) : null}
                <AppText variant="heading">{card[lang].name}</AppText>
                {c.reversed ? <Chip label={t('card.reversed')} /> : null}
              </View>
            </View>
            <AppText>{readingText(card, c.reversed, reading.topic, lang)}</AppText>
          </Card>
        );
      })}

      <View style={styles.section}>
        <AppText variant="heading">{t('journal.notes')}</AppText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('journal.notesPlaceholder')}
          placeholderTextColor={theme.colors.placeholder}
          accessibilityLabel={t('journal.notes')}
          multiline
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          testID="journal-notes-input"
          style={[
            styles.notes,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              fontFamily: fontFamilyFor(scriptForLanguage(lang), false, theme.myanmarFont),
              fontSize: theme.size('body'),
            },
          ]}
        />
        <Button label={t('journal.saveNotes')} onPress={saveNotes} disabled={!notesChanged} testID="journal-save-notes" />
      </View>

      <Button label={t('journal.share')} variant="secondary" onPress={() => setSharing(true)} testID="journal-share" />
      <Button label={t('journal.delete')} variant="ghost" onPress={() => setConfirmDelete(true)} testID="journal-delete" />
      <AppText variant="caption" tone="textMuted" center>
        {t('disclaimer.short')}
      </AppText>

      <ShareSheet
        visible={sharing}
        onClose={() => setSharing(false)}
        title={title}
        subtitle={formatDate(date, lang, { style: 'long', burmeseNumerals })}
        question={reading.question || undefined}
        entries={shareEntries(reading.spreadId, reading.cards, lang)}
      />
      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('journal.deleteTitle')}
        closeLabel={t('common.cancel')}
        testID="journal-delete-sheet"
      >
        <AppText>{t('journal.deleteBody')}</AppText>
        <Button label={t('journal.deleteConfirm')} onPress={doDelete} testID="journal-delete-confirm" />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmDelete(false)} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  cardText: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  section: { gap: spacing.sm },
  notes: { minHeight: 120, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
