import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Card, Chip, ChipGroup, EmptyState, Icon, Screen } from '@/components';
import { CardFace } from '@/components/art';
import { CARD_IMAGES } from '@/data/cardImages';
import { getCard, toRoman } from '@/data/cards';
import { READING_AREAS, type Orientation } from '@/data/types';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { MIN_TAP, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

function BackButton() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))}
      accessibilityRole="button"
      accessibilityLabel={t('card.back')}
      hitSlop={8}
      style={styles.back}
      testID="card-back-button"
    >
      <Icon name="back" color={colors.text} />
      <AppText variant="label">{t('card.back')}</AppText>
    </Pressable>
  );
}

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const { width } = useWindowDimensions();
  const [orientation, setOrientation] = useState<Orientation>('upright');
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen testID="screen-card-missing">
        <BackButton />
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
      <BackButton />

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
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TAP, alignSelf: 'flex-start' },
  hero: { alignItems: 'center', gap: spacing.md },
  titles: { gap: spacing.xs, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
});
