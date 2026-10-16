import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, ChipGroup, EmptyState, Header, Screen, SearchField } from '@/components';
import { CardFace } from '@/components/art';
import { getCard } from '@/data/cards';
import type { ReadingRecord } from '@/db/types';
import { type Topic, TOPICS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import type { Language } from '@/i18n/languages';
import { useJournal } from '@/store/journal';
import { useSettings } from '@/store/settings';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { formatDate, formatTime } from '@/utils/dates';
import { type DateRange, filterReadings, readingTitle } from '@/utils/readings';

function JournalRow({ reading, lang }: { reading: ReadingRecord; lang: Language }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const date = new Date(reading.createdAt);
  const title = readingTitle(reading, lang, t('journal.dailyLabel'));
  const cards = reading.cards.map((c) => getCard(c.cardId)).filter((c) => !!c);
  const when = `${formatDate(date, lang, { style: 'short', burmeseNumerals })} · ${formatTime(date, lang, { burmeseNumerals })}`;
  const first = cards[0];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/journal/[id]', params: { id: reading.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${when}`}
      testID={`journal-row-${reading.id}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {first ? (
        <CardFace card={first} width={52} reversed={reading.cards[0]!.reversed} showName={false} />
      ) : null}
      <View style={styles.rowText}>
        <AppText variant="label" bold>
          {title}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {when} · {t(`reading.topics.${reading.topic}`)}
        </AppText>
        {reading.question ? (
          <AppText variant="caption" numberOfLines={2}>
            “{reading.question}”
          </AppText>
        ) : null}
        <AppText variant="caption" tone="accent" numberOfLines={2}>
          {cards.map((c) => c[lang].name).join(lang === 'my' ? '၊ ' : ', ')}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function Journal() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const readings = useJournal((s) => s.readings);
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const shown = useMemo(
    () => filterReadings(readings, topic, range, undefined, deferredQuery),
    [readings, topic, range, deferredQuery],
  );

  return (
    <Screen testID="screen-journal" scroll={false} contentStyle={styles.content}>
      <Header title={t('journal.title')} />
      {readings.length ? (
        <>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('journal.searchPlaceholder')}
            accessibilityLabel={t('journal.searchA11y')}
            clearLabel={t('library.clearSearch')}
            testID="journal-search"
          />
          <ChipGroup<Topic | 'all'>
            scroll
            testIDPrefix="journal-topic"
            accessibilityLabel={t('journal.filterTopicA11y')}
            value={topic}
            onChange={setTopic}
            options={[
              { value: 'all', label: t('library.all') },
              ...TOPICS.map((v) => ({ value: v, label: t(`reading.topics.${v}`) })),
            ]}
          />
          <ChipGroup<DateRange>
            scroll
            testIDPrefix="journal-range"
            accessibilityLabel={t('journal.filterDateA11y')}
            value={range}
            onChange={setRange}
            options={[
              { value: 'all', label: t('journal.dateAll') },
              { value: '7', label: t('journal.dateDays', { n: fmt(7) }) },
              { value: '30', label: t('journal.dateDays', { n: fmt(30) }) },
              { value: '365', label: t('journal.dateMonths', { n: fmt(12) }) },
            ]}
          />
          {shown.length ? (
            <View style={styles.list}>
              <FlashList
                data={shown}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => <JournalRow reading={item} lang={lang} />}
                extraData={lang}
                ItemSeparatorComponent={Separator}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            <EmptyState icon="journal" title={t('journal.noMatchTitle')} body={t('journal.noMatchBody')} />
          )}
        </>
      ) : (
        <EmptyState
          icon="journal"
          title={t('journal.emptyTitle')}
          body={t('journal.emptyBody')}
          testID="journal-empty"
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, gap: spacing.md },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  rowText: { flex: 1, gap: 2 },
});
