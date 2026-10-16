import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getCard } from '@/data/cards';
import { type DrawnCard, readingText, type SpreadPosition, type Topic } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { PositionGlyph } from '../art/PositionGlyph';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { Chip } from '../Chip';

type Props = { index: number; position: SpreadPosition; drawn: DrawnCard; topic: Topic };

/** One revealed card with its position heading and the reading text for the chosen topic. */
export function PositionCard({ index, position, drawn, topic }: Props) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const theme = useAppTheme();
  const card = getCard(drawn.cardId)!;
  return (
    <Card testID={`reading-position-${index}`}>
      <View style={styles.positionRow}>
        <PositionGlyph id={position.id} size={28} color={theme.colors.primary} />
        <AppText variant="caption" tone="textMuted" style={styles.flex}>
          {t('reading.positionHeading', { number: fmt(index + 1), position: position[lang].name })} ·{' '}
          {position[lang].prompt}
        </AppText>
      </View>
      <View style={styles.cardTitle}>
        <AppText variant="heading">{card[lang].name}</AppText>
        {drawn.reversed ? <Chip label={t('card.reversed')} /> : null}
      </View>
      <AppText>{readingText(card, drawn.reversed, topic, lang)}</AppText>
      <AppText variant="caption" tone="textMuted">
        {card[lang].keywords.join(lang === 'my' ? '၊ ' : ', ')}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  positionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  cardTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
