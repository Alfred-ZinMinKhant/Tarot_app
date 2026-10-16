import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, ChipGroup, EmptyState, Header, Screen, SearchField } from '@/components';
import { CardFace } from '@/components/art';
import { CARDS, searchCards, SUIT_FILTERS, type SuitFilter } from '@/data/cards';
import { SUIT_LABELS } from '@/data/deck';
import type { TarotCard } from '@/data/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { spacing } from '@/theme/spacing';

const GAP = spacing.md;

function columnsFor(width: number): number {
  if (width >= 900) return 6;
  if (width >= 600) return 4;
  return 3;
}

const CardCell = memo(function CardCell({ card, width, name }: { card: TarotCard; width: number; name: string }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
      accessibilityRole="button"
      accessibilityLabel={name}
      testID={`library-card-${card.id}`}
      style={({ pressed }) => [styles.cell, { width, opacity: pressed ? 0.8 : 1 }]}
    >
      <CardFace card={card} width={width} showName={false} />
      <AppText variant="caption" center numberOfLines={3}>
        {name}
      </AppText>
    </Pressable>
  );
});

export default function Library() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [suit, setSuit] = useState<SuitFilter>('all');
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => searchCards(deferredQuery, suit), [deferredQuery, suit]);
  const columns = columnsFor(width);
  const cellWidth = Math.floor((width - spacing.lg * 2 - GAP * (columns - 1)) / columns);

  const filterOptions = useMemo(
    () =>
      SUIT_FILTERS.map((value) => ({
        value,
        label: value === 'all' ? t('library.all') : SUIT_LABELS[value][lang],
      })),
    [lang, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: TarotCard }) => (
      <View style={styles.column}>
        <CardCell card={item} width={cellWidth} name={item[lang].name} />
      </View>
    ),
    [cellWidth, lang],
  );

  return (
    <Screen testID="screen-library" ad scroll={false} contentStyle={styles.content}>
      <Header title={t('library.title')} subtitle={t('library.subtitle', { total: fmt(CARDS.length) })} />

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('library.searchPlaceholder')}
        accessibilityLabel={t('library.searchA11y')}
        clearLabel={t('library.clearSearch')}
        testID="library-search"
      />

      <ChipGroup
        options={filterOptions}
        value={suit}
        onChange={setSuit}
        scroll
        testIDPrefix="library-filter"
        accessibilityLabel={t('library.filterA11y')}
      />

      <AppText variant="caption" tone="textMuted" accessibilityLiveRegion="polite" testID="library-count">
        {t('library.results', { shown: fmt(results.length), total: fmt(CARDS.length) })}
      </AppText>

      {results.length ? (
        <View style={styles.list}>
          <FlashList
            data={results}
            key={columns}
            numColumns={columns}
            renderItem={renderItem}
            keyExtractor={(c) => c.id}
            extraData={lang}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={Separator}
          />
        </View>
      ) : (
        <EmptyState icon="search" title={t('library.noResultsTitle')} body={t('library.noResultsBody')} />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: GAP }} />;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, gap: spacing.md },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  column: { flex: 1, alignItems: 'center' },
  cell: { gap: spacing.xs, alignItems: 'center' },
});
