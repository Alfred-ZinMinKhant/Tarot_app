import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, BackButton, Button, Card, Chip, ChipGroup, EmptyState, Screen, ShareSheet } from '@/components';
import { CardFace } from '@/components/art';
import { CARD_IMAGES } from '@/data/cardImages';
import { getCard, toRoman } from '@/data/cards';
import { READING_AREAS, type Orientation } from '@/data/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { shareEntries } from '@/utils/readings';
import { spacing } from '@/theme/spacing';

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const { width } = useWindowDimensions();
  const [orientation, setOrientation] = useState<Orientation>('upright');
  const [sharing, setSharing] = useState(false);
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen testID="screen-card-missing">
        <BackButton fallback="/library" testID="card-back-button" />
        <EmptyState icon="cards" title={t('card.notFoundTitle')} body={t('card.notFoundBody')} />
      </Screen>
    );
  }

  const text = card[lang];
  const otherName = card[lang === 'en' ? 'my' : 'en'].name;
  const heroWidth = Math.min(Math.round(width * 0.5), 240);
  const number = card.arcana === 'major' ? toRoman(card.number) : fmt(card.number);

  return (
    <Screen testID={`screen-card-${card.id}`}>
      <BackButton fallback="/library" testID="card-back-button" />

      <View style={styles.hero}>
        <CardFace card={card} width={heroWidth} large reversed={orientation === 'reversed'} />
        <View style={styles.titles}>
          <AppText variant="title" center accessibilityRole="header" testID="card-title">
            {text.name}
          </AppText>
          <AppText tone="textMuted" center>
            {otherName}
          </AppText>
        </View>
      </View>

      <Button label={t('card.share')} variant="secondary" onPress={() => setSharing(true)} testID="card-share" />
      <ShareSheet
        visible={sharing}
        onClose={() => setSharing(false)}
        title={text.name}
        subtitle={otherName}
        entries={[{ position: null, card, reversed: orientation === 'reversed' }]}
      />

      <View style={styles.chips}>
        <Chip label={card.arcana === 'major' ? t('card.majorArcana') : text.suit} />
        <Chip label={`${t('card.number')} ${number}`} />
        <Chip label={`${t('card.element')}: ${text.element}`} />
        <Chip label={`${t('card.astrology')}: ${text.astrology}`} />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('card.keywords')}</AppText>
        <View style={styles.chips}>
          {text.keywords.map((k) => (
            <Chip key={k} label={k} />
          ))}
        </View>
      </View>

      <View accessibilityLabel={t('card.orientationA11y')}>
        <ChipGroup<Orientation>
          options={[
            { value: 'upright', label: t('card.upright') },
            { value: 'reversed', label: t('card.reversed') },
          ]}
          value={orientation}
          onChange={setOrientation}
          testIDPrefix="card-orientation"
          accessibilityLabel={t('card.orientationA11y')}
        />
      </View>

      <Card testID="card-meaning">
        <AppText variant="heading">
          {t('card.meaning')} · {t(`card.${orientation}`)}
        </AppText>
        <AppText>{text[orientation]}</AppText>
      </Card>

      {READING_AREAS.map((area) => (
        <Card key={area} testID={`card-area-${area}`}>
          <AppText variant="heading">{t(`card.${area}`)}</AppText>
          <AppText>{text[area][orientation]}</AppText>
        </Card>
      ))}

      <Card>
        <AppText variant="heading">{t('card.advice')}</AppText>
        <AppText>{text.advice}</AppText>
      </Card>
      <AppText variant="caption" tone="textMuted" center testID="card-prompt-note">
        {t('card.promptNote')}
      </AppText>

      {CARD_IMAGES[card.id] ? (
        <AppText variant="caption" tone="textMuted" center>
          {t('card.imageCredit', { year: fmt(1909, { grouping: false }) })}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="textMuted" center testID="card-disclaimer">
        {t('disclaimer.short')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md },
  titles: { gap: spacing.xs, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
});
