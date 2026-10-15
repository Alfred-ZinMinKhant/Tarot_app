import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  AppText,
  BackButton,
  Button,
  Card,
  Chip,
  Header,
  Screen,
  ShareSheet,
  TarotCard,
} from '@/components';
import { getCard } from '@/data/cards';
import { useHaptics } from '@/hooks/useHaptics';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { useDaily } from '@/store/daily';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';
import { formatDate } from '@/utils/dates';
import { shareEntries } from '@/utils/readings';

export default function Daily() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const haptics = useHaptics();
  const toast = useToast((s) => s.show);
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const { width } = useWindowDimensions();
  const draw = useDaily((s) => s.draw);
  const reveal = useDaily((s) => s.reveal);
  const saveToJournal = useDaily((s) => s.saveToJournal);
  const [flipped, setFlipped] = useState(!!draw);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draw || flipped) return;
    const id = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(id);
  }, [draw, flipped]);

  const card = draw ? getCard(draw.cardId) : undefined;
  const dateText = formatDate(new Date(), lang, { style: 'long', burmeseNumerals });
  const heroWidth = Math.min(Math.round(width * 0.55), 240);

  const onReveal = async () => {
    haptics.flip();
    await reveal();
  };

  const onSave = async () => {
    setSaving(true);
    const id = await saveToJournal();
    setSaving(false);
    haptics.success();
    toast(t('journal.saved'), {
      label: t('journal.open'),
      onPress: () => router.push({ pathname: '/journal/[id]', params: { id } }),
    });
  };

  return (
    <Screen testID="screen-daily">
      <BackButton fallback="/home" />
      <Header title={t('daily.title')} subtitle={t('daily.subtitle', { date: dateText })} />

      <View style={styles.hero}>
        {card && draw ? (
          <TarotCard
            card={card}
            width={heroWidth}
            reversed={draw.reversed}
            revealed={flipped}
            accessibilityLabel={card[lang].name}
            testID="daily-hero"
          />
        ) : (
          <TarotCard
            card={getCard('major-00-fool')!}
            width={heroWidth}
            revealed={false}
            onPress={onReveal}
            accessibilityLabel={t('daily.reveal')}
            testID="daily-hero-back"
          />
        )}
      </View>

      {!card || !draw ? (
        <Button label={t('daily.reveal')} onPress={onReveal} testID="daily-reveal-button" />
      ) : (
        <>
          <View style={styles.title}>
            <AppText variant="title" center accessibilityRole="header" testID="daily-title">
              {card[lang].name}
            </AppText>
            {draw.reversed ? <Chip label={t('card.reversed')} /> : null}
          </View>
          <Card>
            <AppText variant="heading">{t('card.meaning')}</AppText>
            <AppText testID="daily-meaning">{draw.reversed ? card[lang].reversed : card[lang].upright}</AppText>
            <AppText variant="caption" tone="textMuted">
              {card[lang].keywords.join(lang === 'my' ? '၊ ' : ', ')}
            </AppText>
          </Card>
          <Card>
            <AppText variant="heading">{t('card.advice')}</AppText>
            <AppText>{card[lang].advice}</AppText>
          </Card>

          {draw.readingId ? (
            <Button
              label={t('daily.openJournal')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/journal/[id]', params: { id: draw.readingId! } })}
              testID="daily-open-journal"
            />
          ) : (
            <Button label={t('daily.save')} onPress={onSave} loading={saving} testID="daily-save" />
          )}
          <Button label={t('daily.share')} variant="secondary" onPress={() => setSharing(true)} testID="daily-share" />
          <Button
            label={t('daily.viewCard')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
            testID="daily-view-card"
          />
          <ShareSheet
            visible={sharing}
            onClose={() => setSharing(false)}
            title={t('daily.title')}
            subtitle={dateText}
            entries={shareEntries('daily', [{ positionId: 'daily', cardId: card.id, reversed: draw.reversed }], lang)}
          />
        </>
      )}

      <AppText variant="caption" tone="textMuted" center>
        {t('disclaimer.short')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  title: { alignItems: 'center', gap: spacing.sm },
});
