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
import { readingText, type DrawnCard } from '@/engine';
import { useHaptics } from '@/hooks/useHaptics';
import { useLanguage } from '@/hooks/useLanguage';
import { useAds, useRewardedAvailable } from '@/store/ads';
import { usePremium } from '@/store/premium';
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
          <DailyRewards cardId={card.id} reversed={draw.reversed} />

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

const AREAS = ['love', 'career', 'money', 'health'] as const;

/**
 * A deeper reading (love, career, money, health) and a second card for today. A finished rewarded
 * ad unlocks each one; Premium has them without ads. Builds without ads never show them.
 */
function DailyRewards({ cardId, reversed }: { cardId: string; reversed: boolean }) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const toast = useToast((s) => s.show);
  const isPremium = usePremium((s) => s.isPremium);
  const offered = useRewardedAvailable();
  const dateKey = useDaily((s) => s.dateKey);
  const bonus = useDaily((s) => s.bonus);
  const unlockDeeper = useDaily((s) => s.unlockDeeper);
  const unlockExtra = useDaily((s) => s.unlockExtra);
  const [busy, setBusy] = useState<'deeper' | 'extra' | null>(null);

  const today = bonus?.dateKey === dateKey ? bonus : null;
  const deeper = isPremium || !!today?.deeper;
  const extra: DrawnCard | null = today?.extra ?? null;

  // Premium gets both without an ad.
  useEffect(() => {
    if (!isPremium) return;
    if (!today?.deeper) unlockDeeper();
    if (!today?.extra) unlockExtra();
  }, [isPremium, today?.deeper, today?.extra, unlockDeeper, unlockExtra]);

  const watch = async (kind: 'deeper' | 'extra') => {
    setBusy(kind);
    const outcome = await useAds.getState().watchRewarded();
    setBusy(null);
    if (outcome !== 'earned') {
      toast(t(outcome === 'closed' ? 'ads.notFinished' : 'ads.unavailable'));
      return;
    }
    if (kind === 'deeper') unlockDeeper();
    else unlockExtra();
  };

  const card = getCard(cardId);
  const extraCard = extra ? getCard(extra.cardId) : undefined;
  if (!card) return null;

  return (
    <>
      {deeper ? (
        <Card testID="daily-deeper">
          <AppText variant="heading">{t('daily.deeperTitle')}</AppText>
          {AREAS.map((area) => (
            <View key={area} style={styles.area}>
              <AppText variant="caption" tone="textMuted">
                {t(`card.${area}`)}
              </AppText>
              <AppText>{readingText(card, reversed, area, lang)}</AppText>
            </View>
          ))}
        </Card>
      ) : offered ? (
        <Card>
          <AppText variant="heading">{t('daily.deeperTitle')}</AppText>
          <AppText tone="textMuted">{t('daily.deeperBody')}</AppText>
          <Button
            label={t('daily.deeperWatch')}
            variant="secondary"
            onPress={() => watch('deeper')}
            loading={busy === 'deeper'}
            testID="daily-deeper-watch"
          />
        </Card>
      ) : null}

      {extra && extraCard ? (
        <Card testID="daily-extra">
          <AppText variant="heading">{t('daily.extraTitle')}</AppText>
          <View style={styles.title}>
            <AppText variant="title" center>
              {extraCard[lang].name}
            </AppText>
            {extra.reversed ? <Chip label={t('card.reversed')} /> : null}
          </View>
          <AppText>{extra.reversed ? extraCard[lang].reversed : extraCard[lang].upright}</AppText>
          <AppText variant="caption" tone="textMuted">
            {extraCard[lang].keywords.join(lang === 'my' ? '၊ ' : ', ')}
          </AppText>
        </Card>
      ) : offered ? (
        <Card>
          <AppText variant="heading">{t('daily.extraTitle')}</AppText>
          <AppText tone="textMuted">{t('daily.extraBody')}</AppText>
          <Button
            label={t('daily.extraWatch')}
            variant="secondary"
            onPress={() => watch('extra')}
            loading={busy === 'extra'}
            testID="daily-extra-watch"
          />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  area: { gap: spacing.xs },
  hero: { alignItems: 'center' },
  title: { alignItems: 'center', gap: spacing.sm },
});
