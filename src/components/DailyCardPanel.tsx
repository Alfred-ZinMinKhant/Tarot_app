import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { getCard } from '@/data/cards';
import { useHaptics } from '@/hooks/useHaptics';
import { useLanguage } from '@/hooks/useLanguage';
import { useDaily } from '@/store/daily';
import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';
import { CardBack } from './art/CardBack';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { TarotCard } from './TarotCard';

const CARD_WIDTH = 112;

/** Home's Card of the Day: tap the face-down card to reveal it (once per day), then read more. */
export function DailyCardPanel() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const haptics = useHaptics();
  const draw = useDaily((s) => s.draw);
  const reveal = useDaily((s) => s.reveal);
  const [flipped, setFlipped] = useState(!!draw);
  const card = draw ? getCard(draw.cardId) : undefined;

  // Start face down when the draw first arrives, then flip so the reveal animates.
  useEffect(() => {
    if (!draw || flipped) return;
    const id = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(id);
  }, [draw, flipped]);

  const onReveal = async () => {
    haptics.flip();
    await reveal();
  };

  return (
    <Card testID="daily-panel">
      <AppText variant="heading" accessibilityRole="header">
        {t('home.dailyTitle')}
      </AppText>
      <View style={styles.row}>
        {card && draw ? (
          <TarotCard
            card={card}
            width={CARD_WIDTH}
            reversed={draw.reversed}
            revealed={flipped}
            onPress={() => router.push('/daily')}
            accessibilityLabel={card[lang].name}
            testID="daily-card"
          />
        ) : (
          <Pressable
            onPress={onReveal}
            accessibilityRole="button"
            accessibilityLabel={t('home.dailyTap')}
            testID="daily-reveal"
          >
            <CardBack width={CARD_WIDTH} />
          </Pressable>
        )}
        <View style={styles.text}>
          {card && draw ? (
            <>
              <AppText variant="label" bold testID="daily-name">
                {card[lang].name}
              </AppText>
              {draw.reversed ? <Chip label={t('card.reversed')} /> : null}
              <AppText variant="caption">{card[lang].advice}</AppText>
            </>
          ) : (
            <AppText tone="textMuted">{t('home.dailyTap')}</AppText>
          )}
        </View>
      </View>
      {card ? (
        <Button
          label={t('home.dailyReadMore')}
          variant="secondary"
          onPress={() => router.push('/daily')}
          testID="daily-read-more"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  text: { flex: 1, gap: spacing.sm, alignItems: 'flex-start' },
});
