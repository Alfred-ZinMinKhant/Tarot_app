import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  AppText,
  BackButton,
  Button,
  Card,
  Chip,
  EmptyState,
  FanDeck,
  Header,
  Screen,
  ShuffleStack,
  ShareSheet,
  SpreadBoard,
} from '@/components';
import { SpreadGlyph } from '@/components/art/SpreadGlyph';
import { CrisisCard } from '@/components/reading/CrisisCard';
import { AnswerCard } from '@/components/reading/AnswerCard';
import { PositionCard } from '@/components/reading/PositionCard';
import { ResumeCard } from '@/components/reading/ResumeCard';
import { SetupForm } from '@/components/reading/SetupForm';
import { answerQuestion, getSpread, summarize, type Topic, TOPICS } from '@/engine';
import { FAN_SIZE, useReadingFlow } from '@/hooks/useReadingFlow';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { consumeSpreadGrant, useAds } from '@/store/ads';
import { purchasesAvailable } from '@/store/premium';
import { useSpreadLocked } from '@/store/spreadAccess';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { topicTint } from '@/theme/topicTheme';
import { formatDate } from '@/utils/dates';
import { shareEntries } from '@/utils/readings';

const isTopic = (v: unknown): v is Topic =>
  typeof v === 'string' && (TOPICS as readonly string[]).includes(v);

export default function Reading() {
  const params = useLocalSearchParams<{ spreadId: string; topic?: string }>();
  const spread = getSpread(params.spreadId ?? '');
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const theme = useAppTheme();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  // A finished rewarded ad opens this one reading of a Premium spread.
  const [adPass] = useState(() => consumeSpreadGrant(params.spreadId ?? ''));
  const locked = useSpreadLocked(params.spreadId ?? '') && !adPass;
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 720) - spacing.lg * 2;
  const [sharing, setSharing] = useState(false);

  const flow = useReadingFlow(spread, isTopic(params.topic) ? params.topic : 'general');
  const {
    phase, setPhase, topic, setTopic, question, setQuestion, count, picks, drawn, revealed,
    busy, allRevealed, reversals, start, pick, pickForMe, reveal, revealAll, restart, finishShuffle,
    pendingDraft, resume, discardDraft, savedId,
  } = flow;

  // A finished, saved reading counts toward the occasional interstitial; it only shows on the way out.
  const spreadId = spread?.id;
  useEffect(() => {
    if (savedId && spreadId) useAds.getState().noteReadingFinished(spreadId);
  }, [savedId, spreadId]);
  const [leaving, setLeaving] = useState(false);
  const leave = async (go: () => void) => {
    if (leaving) return;
    setLeaving(true);
    await useAds.getState().showInterstitialIfDue();
    go();
    setLeaving(false);
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
        <EmptyState icon="cards" title={spread[lang].name} body={t(purchasesAvailable() ? 'premium.lockedBody' : 'ads.lockedBody')} />
        <Button
          label={t(purchasesAvailable() ? 'premium.see' : 'ads.see')}
          onPress={() =>
            router.replace({ pathname: '/paywall', params: { reason: `spread:${spread.id}` } })
          }
          testID="reading-unlock"
        />
      </Screen>
    );
  }

  const positionName = (i: number) => spread.positions[i]![lang].name;
  const faceLabel = (i: number, card: string, reversed: boolean) =>
    t(reversed ? 'reading.faceReversedA11y' : 'reading.faceA11y', { position: positionName(i), card });
  const tint = topicTint(topic);
  const answer = allRevealed ? answerQuestion(drawn, question, topic) : null;
  const summary = allRevealed ? summarize(drawn, lang, { reversals, topic }) : [];

  return (
    <Screen testID="screen-reading" lockTouch={busy}>
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

      {phase !== 'setup' && phase !== 'crisis' && tint ? (
        <View style={styles.topicBadge}>
          <Chip label={t(`reading.topics.${topic}`)} selected accent={tint} />
        </View>
      ) : null}

      {pendingDraft ? <ResumeCard onContinue={resume} onDiscard={discardDraft} /> : null}

      {phase === 'setup' ? (
        <SetupForm
          topic={topic}
          onTopic={setTopic}
          question={question}
          onQuestion={setQuestion}
          onStart={start}
        />
      ) : null}

      {phase === 'crisis' ? <CrisisCard onEdit={() => setPhase('setup')} /> : null}

      {phase === 'shuffling' ? (
        <View style={styles.centre}>
          <ShuffleStack
            width={contentWidth}
            tint={tint}
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
            tint={tint}
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
            tint={tint}
            spread={spread}
            cards={spread.positions.map((_, i) => drawn[i])}
            revealed={[]}
            width={contentWidth}
            lang={lang}
            slotLabel={(i) => t('reading.slotA11y', { position: positionName(i) })}
            revealLabel={(i) => t('reading.turnOverA11y', { position: positionName(i) })}
            faceLabel={faceLabel}
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
            tint={tint}
            spread={spread}
            cards={drawn}
            revealed={revealed}
            onReveal={reveal}
            width={contentWidth}
            lang={lang}
            slotLabel={(i) => t('reading.slotA11y', { position: positionName(i) })}
            revealLabel={(i) => t('reading.turnOverA11y', { position: positionName(i) })}
            faceLabel={faceLabel}
          />
          {!allRevealed ? (
            <Button
              label={t('reading.revealAll')}
              variant="secondary"
              onPress={revealAll}
              testID="reading-reveal-all"
            />
          ) : null}

          {drawn.map((d, i) =>
            revealed[i] ? (
              <PositionCard
                key={spread.positions[i]!.id}
                index={i}
                spreadId={spread.id}
                position={spread.positions[i]!}
                drawn={d}
                topic={topic}
              />
            ) : null,
          )}

          {allRevealed ? (
            <>
              {answer ? <AnswerCard answer={answer} question={question} topic={topic} /> : null}
              <Card testID="reading-summary" style={tint ? { borderColor: tint, borderWidth: 1 } : undefined}>
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
              <Button label={t('reading.newReading')} onPress={() => leave(restart)} disabled={leaving} testID="reading-new" />
              <Button
                label={t('reading.backHome')}
                variant="ghost"
                onPress={() => leave(() => router.replace('/home'))}
                disabled={leaving}
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

const styles = StyleSheet.create({
  centre: { alignItems: 'center', gap: spacing.sm },
  layoutPreview: { alignItems: 'center' },
  topicBadge: { alignItems: 'center' },
});
