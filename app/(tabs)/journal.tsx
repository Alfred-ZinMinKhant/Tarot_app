import { FlashList } from '@shopify/flash-list';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ChipGroup, EmptyState, Header, ReadingRow, Screen, SearchField } from '@/components';
import { type Topic, TOPICS } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { spacing } from '@/theme/spacing';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useJournal } from '@/store/journal';
import { type DateRange, filterReadings } from '@/utils/readings';

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
                renderItem={({ item }) => <ReadingRow reading={item} lang={lang} showQuestion testID={`journal-row-${item.id}`} />}
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
});
