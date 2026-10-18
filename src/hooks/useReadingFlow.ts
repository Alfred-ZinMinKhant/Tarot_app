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
/** Gap between cards when "Choose for me" deals them one by one. */
const AUTO_PICK_STEP_MS = 90;
/** Touches stay locked this long after the board appears, while the cards mount and settle. */
const REVEAL_SETTLE_MS = 800;

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
  // True while "Choose for me" is dealing cards, so a stray tap can't pick the same card twice.
  const autoPicking = useRef(false);
  // Touch is locked from the first deal until the face-down board has settled: scrolling or tapping
  // while ten cards mount and animate froze the app on the Celtic Cross.
  const [busy, setBusy] = useState(false);
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
    autoPicking.current = false;
    setBusy(false);
    setDeck(prepareDeck({ reversals }));
    setPicks([]);
    setRevealed(Array.from({ length: count }, () => false));
    setPhase('shuffling');
    haptics.shuffle();
    later(finishShuffle, reduceMotion ? 0 : SHUFFLE_MS);
  };

  const pick = (index: number) => {
    if (phase !== 'picking' || autoPicking.current || picks.includes(index) || picks.length >= count)
      return;
    const next = [...picks, index];
    setPicks(next);
    haptics.select();
    if (next.length === count) toReveal();
  };

  /** After the last pick: show the board, then keep touch locked until it has settled. */
  const toReveal = () => {
    setBusy(true);
    later(() => {
      autoPicking.current = false;
      setPhase('reveal');
      later(() => setBusy(false), reduceMotion ? 0 : REVEAL_SETTLE_MS);
    }, AFTER_LAST_PICK_MS);
  };

  const pickForMe = () => {
    if (autoPicking.current) return;
    const remaining = Array.from({ length: FAN_SIZE }, (_, i) => i).filter(
      (i) => !picks.includes(i),
    );
    const chosen: number[] = [];
    while (picks.length + chosen.length < count && remaining.length)
      chosen.push(remaining.splice(secureRandom(remaining.length), 1)[0]!);
    if (reduceMotion) {
      setPicks([...picks, ...chosen]);
      haptics.select();
      toReveal();
      return;
    }
    // Deal the cards one at a time, like picking by hand. Mounting the whole board and lifting every
    // fan card in a single frame froze the Celtic Cross (10 cards) until Android killed the app.
    autoPicking.current = true;
    setBusy(true);
    let dealt = 0;
    const deal = () => {
      const index = chosen[dealt++]!;
      setPicks((p) => [...p, index]);
      haptics.select();
      if (dealt < chosen.length) {
        later(deal, AUTO_PICK_STEP_MS);
      } else {
        toReveal();
      }
    };
    deal();
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
    autoPicking.current = false;
    setBusy(false);
    setPhase('setup');
    setPicks([]);
    setDeck([]);
    setRevealed([]);
  };

  return {
    busy,
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
    savedId,
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
