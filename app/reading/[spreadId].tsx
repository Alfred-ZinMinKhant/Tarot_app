import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  AppText,
  BackButton,
  Button,
  Card,
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
import { PositionCard } from '@/components/reading/PositionCard';
import { ResumeCard } from '@/components/reading/ResumeCard';
import { SetupForm } from '@/components/reading/SetupForm';
import { getSpread, summarize, type Topic, TOPICS } from '@/engine';
import { FAN_SIZE, useReadingFlow } from '@/hooks/useReadingFlow';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { consumeSpreadGrant } from '@/store/ads';
import { useSpreadLocked } from '@/store/premium';
import { useSettings } from '@/store/settings';
import { spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
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
    allRevealed, reversals, start, pick, pickForMe, reveal, revealAll, restart, finishShuffle,
    pendingDraft, resume, discardDraft,
  } = flow;

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

          {drawn.map((d, i) =>
            revealed[i] ? (
              <PositionCard
                key={spread.positions[i]!.id}
                index={i}
                position={spread.positions[i]!}
                drawn={d}
                topic={topic}
              />
            ) : null,
          )}

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

const styles = StyleSheet.create({
  centre: { alignItems: 'center', gap: spacing.sm },
  layoutPreview: { alignItems: 'center' },
});
