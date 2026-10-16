import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import {
  AppText,
  BackButton,
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  FanDeck,
  Header,
  Screen,
  ShuffleStack,
  ShareSheet,
  SpreadBoard,
} from '@/components';
import { PositionGlyph } from '@/components/art/PositionGlyph';
import { SpreadGlyph } from '@/components/art/SpreadGlyph';
import { getCard } from '@/data/cards';
import {
  configuredHelpline,
  detectCrisis,
  type DrawnCard,
  getSpread,
  prepareDeck,
  readingText,
  secureRandom,
  summarize,
  type Topic,
  TOPICS,
} from '@/engine';
import { useHaptics } from '@/hooks/useHaptics';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { useJournal } from '@/store/journal';
import { useSpreadLocked } from '@/store/premium';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamilyFor, scriptForLanguage } from '@/theme/typography';
import { formatDate } from '@/utils/dates';
import { shareEntries } from '@/utils/readings';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Phase = 'setup' | 'crisis' | 'shuffling' | 'picking' | 'reveal';

/** Cards shown face down in the fan (taken from the top of the freshly shuffled deck). */
const FAN_SIZE = 21;
const SHUFFLE_MS = 1600;
const AFTER_LAST_PICK_MS = 350;

const isTopic = (v: unknown): v is Topic =>
  typeof v === 'string' && (TOPICS as readonly string[]).includes(v);

export default function Reading() {
  const params = useLocalSearchParams<{ spreadId: string; topic?: string }>();
  const spread = getSpread(params.spreadId ?? '');
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const theme = useAppTheme();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const reversals = useSettings((s) => s.reversedCards);
  const locked = useSpreadLocked(params.spreadId ?? '');
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 720) - spacing.lg * 2;

  const [phase, setPhase] = useState<Phase>('setup');
  const [topic, setTopic] = useState<Topic>(isTopic(params.topic) ? params.topic : 'general');
  const [question, setQuestion] = useState('');
  const [deck, setDeck] = useState<DrawnCard[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const saveReading = useJournal((s) => s.save);
  const toast = useToast((s) => s.show);
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const count = spread?.cardCount ?? 0;
  const drawn = useMemo(() => picks.map((i) => deck[i]!), [picks, deck]);
  const allRevealed = phase === 'reveal' && revealed.length === count && revealed.every(Boolean);

  // Every finished reading is saved to the journal automatically (once).
  const saving = useRef(false);
  useEffect(() => {
    if (!allRevealed || savedId || saving.current || !spread) return;
    saving.current = true;
    void saveReading({
      kind: 'spread',
      spreadId: spread.id,
      topic,
      question,
      cards: drawn.map((d, i) => ({
        positionId: spread.positions[i]!.id,
        cardId: d.cardId,
        reversed: d.reversed,
      })),
    })
      .then((record) => {
        setSavedId(record.id);
        toast(t('journal.saved'), {
          label: t('journal.open'),
          onPress: () => router.push({ pathname: '/journal/[id]', params: { id: record.id } }),
        });
      })
      .finally(() => {
        saving.current = false;
      });
  }, [allRevealed, savedId, spread, topic, question, drawn, saveReading, toast, t]);

  const later = useCallback((fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);

  const finishShuffle = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPhase((p) => (p === 'shuffling' ? 'picking' : p));
  }, []);

  const start = () => {
    if (detectCrisis(question)) {
      setPhase('crisis');
      return;
    }
    setDeck(prepareDeck({ reversals }));
    setPicks([]);
    setRevealed(Array.from({ length: count }, () => false));
    setPhase('shuffling');
    haptics.shuffle();
    later(finishShuffle, reduceMotion ? 0 : SHUFFLE_MS);
  };

  const pick = (index: number) => {
    if (phase !== 'picking' || picks.includes(index) || picks.length >= count) return;
    const next = [...picks, index];
    setPicks(next);
    haptics.select();
    if (next.length === count) later(() => setPhase('reveal'), AFTER_LAST_PICK_MS);
  };

  const pickForMe = () => {
    const remaining = Array.from({ length: FAN_SIZE }, (_, i) => i).filter(
      (i) => !picks.includes(i),
    );
    const next = [...picks];
    while (next.length < count && remaining.length)
      next.push(remaining.splice(secureRandom(remaining.length), 1)[0]!);
    setPicks(next);
    haptics.select();
    later(() => setPhase('reveal'), AFTER_LAST_PICK_MS);
  };

  const reveal = (i: number) => {
    setRevealed((r) => r.map((v, j) => (j === i ? true : v)));
    haptics.flip();
  };
  const revealAll = () => {
    setRevealed((r) => r.map(() => true));
    haptics.success();
  };
  const restart = () => {
    setSavedId(null);
    setPhase('setup');
    setPicks([]);
    setDeck([]);
    setRevealed([]);
  };

  if (!spread) {
    return (
      <Screen testID="screen-reading-missing">
        <BackButton fallback="/home" />
        <EmptyState icon="cards" title={t('reading.notFound')} />
      </Screen>
    );
  }

  if (locked) {
    // Reached directly (deep link or old journal link) without Premium.
    return (
      <Screen testID="screen-reading-locked">
        <BackButton fallback="/home" />
        <EmptyState icon="cards" title={spread[lang].name} body={t('premium.lockedBody')} />
        <Button
          label={t('premium.see')}
          onPress={() =>
            router.replace({ pathname: '/paywall', params: { reason: `spread:${spread.id}` } })
          }
          testID="reading-unlock"
        />
      </Screen>
    );
  }

  const positionName = (i: number) => spread.positions[i]![lang].name;
  const summary = allRevealed ? summarize(drawn, lang, { reversals }) : [];
  const inputScript = scriptForLanguage(lang);

  return (
    <Screen testID="screen-reading">
      <BackButton fallback="/home" />
      <Header
        title={spread[lang].name}
        subtitle={phase === 'setup' ? spread[lang].description : undefined}
      />

      {phase === 'setup' ? (
        <View style={styles.layoutPreview} testID="reading-layout-preview">
          <SpreadGlyph spread={spread} size={96} color={theme.colors.primary} fill={theme.colors.surfaceAlt} />
        </View>
      ) : null}

      {phase !== 'setup' && phase !== 'crisis' && question.trim() ? (
        <AppText tone="textMuted" testID="reading-question">
          {t('reading.questionShown', { question: question.trim() })}
        </AppText>
      ) : null}

      {phase === 'setup' ? (
        <>
          <View style={styles.section}>
            <AppText variant="heading">{t('reading.topicTitle')}</AppText>
            <ChipGroup<Topic>
              testIDPrefix="topic"
              value={topic}
              onChange={setTopic}
              options={TOPICS.map((value) => ({ value, label: t(`reading.topics.${value}`) }))}
            />
          </View>
          <View style={styles.section}>
            <AppText variant="label" bold>
              {t('reading.questionLabel')}
            </AppText>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={t('reading.questionPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={t('reading.questionLabel')}
              multiline
              maxLength={300}
              autoCorrect={false}
              autoCapitalize="sentences"
              spellCheck={false}
              textAlignVertical="top"
              testID="reading-question-input"
              style={[
                styles.question,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  fontFamily: fontFamilyFor(inputScript, false, theme.myanmarFont),
                  fontSize: theme.size('body'),
                },
              ]}
            />
            <AppText variant="caption" tone="textMuted">
              {t('reading.questionHint')}
            </AppText>
          </View>
          <Button label={t('reading.start')} onPress={start} testID="reading-start" />
        </>
      ) : null}

      {phase === 'crisis' ? <CrisisCard onEdit={() => setPhase('setup')} /> : null}

      {phase === 'shuffling' ? (
        <View style={styles.centre}>
          <ShuffleStack
            width={contentWidth}
            onPress={finishShuffle}
            accessibilityLabel={t('reading.shuffleTap')}
            testID="reading-shuffle"
          />
          <AppText variant="heading" center accessibilityLiveRegion="polite">
            {t('reading.shuffling')}
          </AppText>
          <AppText tone="textMuted" center>
            {t('reading.shuffleHint')}
          </AppText>
        </View>
      ) : null}

      {phase === 'picking' ? (
        <>
          <AppText
            variant="heading"
            center
            accessibilityLiveRegion="polite"
            testID="reading-pick-title"
          >
            {t('reading.pickTitle', { remaining: fmt(count - picks.length) })}
          </AppText>
          <FanDeck
            count={FAN_SIZE}
            picked={picks}
            onPick={pick}
            width={contentWidth}
            disabled={picks.length >= count}
            cardLabel={(i) => t('reading.pickA11y', { number: fmt(i + 1) })}
          />
          <Button
            label={t('reading.pickForMe')}
            variant="secondary"
            onPress={pickForMe}
            disabled={picks.length >= count}
            testID="reading-pick-for-me"
          />
          <SpreadBoard
            spread={spread}
            cards={spread.positions.map((_, i) => drawn[i])}
            revealed={[]}
            width={contentWidth}
            lang={lang}
            slotLabel={(i) => t('reading.slotA11y', { position: positionName(i) })}
            revealLabel={(i) => t('reading.turnOverA11y', { position: positionName(i) })}
          />
        </>
      ) : null}

      {phase === 'reveal' ? (
        <>
          {!allRevealed ? (
            <AppText variant="heading" center>
              {t('reading.revealTitle')}
            </AppText>
          ) : null}
          <SpreadBoard
            spread={spread}
            cards={drawn}
            revealed={revealed}
            onReveal={reveal}
            width={contentWidth}
            lang={lang}
            slotLabel={(i) => t('reading.slotA11y', { position: positionName(i) })}
            revealLabel={(i) => t('reading.turnOverA11y', { position: positionName(i) })}
          />
          {!allRevealed ? (
            <Button
              label={t('reading.revealAll')}
              variant="secondary"
              onPress={revealAll}
              testID="reading-reveal-all"
            />
          ) : null}

          {drawn.map((d, i) => {
            if (!revealed[i]) return null;
            const card = getCard(d.cardId)!;
            const pos = spread.positions[i]!;
            return (
              <Card key={pos.id} testID={`reading-position-${i}`}>
                <View style={styles.positionRow}>
                  <PositionGlyph id={pos.id} size={28} color={theme.colors.primary} />
                  <AppText variant="caption" tone="textMuted" style={styles.flex}>
                    {t('reading.positionHeading', { number: fmt(i + 1), position: pos[lang].name })} ·{' '}
                    {pos[lang].prompt}
                  </AppText>
                </View>
                <View style={styles.cardTitle}>
                  <AppText variant="heading">{card[lang].name}</AppText>
                  {d.reversed ? <Chip label={t('card.reversed')} /> : null}
                </View>
                <AppText>{readingText(card, d.reversed, topic, lang)}</AppText>
                <AppText variant="caption" tone="textMuted">
                  {card[lang].keywords.join(lang === 'my' ? '၊ ' : ', ')}
                </AppText>
              </Card>
            );
          })}

          {allRevealed ? (
            <>
              <Card testID="reading-summary">
                <AppText variant="heading">{t('reading.summaryTitle')}</AppText>
                {summary.map((line) => (
                  <AppText key={line.key}>{t(`reading.summary.${line.key}`, line.params)}</AppText>
                ))}
              </Card>
              <Button
                label={t('reading.share')}
                variant="secondary"
                onPress={() => setSharing(true)}
                testID="reading-share"
              />
              <ShareSheet
                visible={sharing}
                onClose={() => setSharing(false)}
                title={spread[lang].name}
                subtitle={formatDate(new Date(), lang, { style: 'long', burmeseNumerals })}
                question={question.trim() || undefined}
                entries={shareEntries(
                  spread.id,
                  drawn.map((d, i) => ({
                    positionId: spread.positions[i]!.id,
                    cardId: d.cardId,
                    reversed: d.reversed,
                  })),
                  lang,
                )}
              />
              <Button label={t('reading.newReading')} onPress={restart} testID="reading-new" />
              <Button
                label={t('reading.backHome')}
                variant="ghost"
                onPress={() => router.replace('/home')}
                testID="reading-home"
              />
            </>
          ) : null}
          <AppText variant="caption" tone="textMuted" center testID="reading-disclaimer">
            {t('disclaimer.short')}
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}

function CrisisCard({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const helpline = configuredHelpline();
  return (
    <View
      style={[styles.crisis, { backgroundColor: colors.surface, borderColor: colors.accent }]}
      testID="reading-crisis"
      accessibilityLiveRegion="assertive"
    >
      <AppText variant="heading">{t('reading.crisisTitle')}</AppText>
      <AppText>{t('reading.crisisBody')}</AppText>
      {helpline ? (
        <>
          <AppText bold>{t('reading.crisisHelpline', { name: helpline.name })}</AppText>
          {helpline.phone ? (
            <Button
              label={t('reading.crisisCall', { phone: helpline.phone })}
              onPress={() => Linking.openURL(`tel:${helpline.phone.replace(/[^\d+]/g, '')}`)}
              testID="reading-crisis-call"
            />
          ) : null}
          {helpline.url ? (
            <Button
              label={t('reading.crisisWebsite')}
              variant="secondary"
              onPress={() => Linking.openURL(helpline.url)}
              testID="reading-crisis-website"
            />
          ) : null}
        </>
      ) : null}
      <Button
        label={t('reading.crisisEdit')}
        variant="ghost"
        onPress={onEdit}
        testID="reading-crisis-edit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  question: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  centre: { alignItems: 'center', gap: spacing.sm },
  positionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  layoutPreview: { alignItems: 'center' },
  cardTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  crisis: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
});
