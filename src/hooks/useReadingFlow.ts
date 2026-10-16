import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  detectCrisis,
  type DrawnCard,
  prepareDeck,
  secureRandom,
  type Spread,
  type Topic,
} from '@/engine';
import { useHaptics } from '@/hooks/useHaptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useJournal } from '@/store/journal';
import { useReadingDraft, usableDraft } from '@/store/readingDraft';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { logError } from '@/utils/log';

export type ReadingPhase = 'setup' | 'crisis' | 'shuffling' | 'picking' | 'reveal';

/** Cards shown face down in the fan (taken from the top of the freshly shuffled deck). */
export const FAN_SIZE = 21;
const SHUFFLE_MS = 1600;
const AFTER_LAST_PICK_MS = 350;

/**
 * The reading state machine: setup -> shuffling -> picking -> reveal, with the crisis detour, the
 * timers between phases, and the one-time autosave to the journal once every card is face up.
 */
export function useReadingFlow(spread: Spread | undefined, initialTopic: Topic) {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const reversals = useSettings((s) => s.reversedCards);
  const saveReading = useJournal((s) => s.save);
  const toast = useToast((s) => s.show);

  const [phase, setPhase] = useState<ReadingPhase>('setup');
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [question, setQuestion] = useState('');
  const [deck, setDeck] = useState<DrawnCard[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storedDraft = useReadingDraft((s) => s.draft);
  const saveDraft = useReadingDraft((s) => s.save);
  const clearDraft = useReadingDraft((s) => s.clear);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const count = spread?.cardCount ?? 0;
  const drawn = useMemo(() => picks.map((i) => deck[i]!), [picks, deck]);
  const allRevealed = phase === 'reveal' && revealed.length === count && revealed.every(Boolean);

  // Keep an unfinished reading so it can be picked up again; a finished one lives in the journal.
  useEffect(() => {
    if (!spread) return;
    if (allRevealed) {
      clearDraft();
      return;
    }
    if ((phase === 'picking' || phase === 'reveal') && picks.length > 0) {
      saveDraft({
        spreadId: spread.id,
        topic,
        question,
        deck: deck.slice(0, FAN_SIZE),
        picks,
        revealed,
        savedAt: Date.now(),
      });
    }
  }, [allRevealed, phase, spread, topic, question, deck, picks, revealed, saveDraft, clearDraft]);

  // Every finished reading is saved to the journal automatically (once).
  const saving = useRef(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
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
      .catch((e) => {
        logError('reading.save', e);
        toast(t('journal.saveFailed'), {
          label: t('common.errorRetry'),
          onPress: () => setSaveAttempt((n) => n + 1),
        });
      })
      .finally(() => {
        saving.current = false;
      });
  }, [allRevealed, savedId, spread, topic, question, drawn, saveReading, toast, t, saveAttempt]);

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
    clearDraft();
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
  const pendingDraft = phase === 'setup' ? usableDraft(storedDraft, spread) : null;
  const resume = () => {
    if (!pendingDraft) return;
    setTopic(pendingDraft.topic);
    setQuestion(pendingDraft.question);
    setDeck(pendingDraft.deck);
    setPicks(pendingDraft.picks);
    setRevealed(pendingDraft.revealed);
    setPhase(pendingDraft.picks.length >= count ? 'reveal' : 'picking');
  };
  const restart = () => {
    clearDraft();
    setSavedId(null);
    setPhase('setup');
    setPicks([]);
    setDeck([]);
    setRevealed([]);
  };

  return {
    phase,
    setPhase,
    topic,
    setTopic,
    question,
    setQuestion,
    count,
    picks,
    drawn,
    revealed,
    allRevealed,
    reversals,
    start,
    pick,
    pickForMe,
    reveal,
    revealAll,
    restart,
    finishShuffle,
    pendingDraft,
    resume,
    discardDraft: clearDraft,
  };
}
