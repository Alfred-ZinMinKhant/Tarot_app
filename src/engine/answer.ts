import { getCard } from '@/data/cards';
import type { Suit } from '@/data/types';

import type { DrawnCard } from './draw';
import type { Topic } from './interpret';

export type QuestionKind = 'yesno' | 'when' | 'open';
export type Verdict = 'yes' | 'leaningYes' | 'unclear' | 'leaningNo' | 'no';
export type Timing = 'wands' | 'swords' | 'cups' | 'pentacles' | 'major';

export type Answer = {
  kind: QuestionKind;
  /** Only for yes/no questions outside the health topic. */
  verdict?: Verdict;
  /** Only for "when" questions. */
  timing?: Timing;
  /** True when reversed cards suggest delays. */
  delayed?: boolean;
  /** The card that speaks most to the question: the last one drawn (the outcome or advice). */
  keyCardId: string;
  keyReversed: boolean;
};

const WHEN = /\b(when|how long|how soon|what time)\b|ဘယ်တော့|ဘယ်အချိန်|ဘယ်လောက်ကြာ/i;
const YES_NO =
  /^\s*(will|am|is|are|do|does|did|can|could|should|shall|would|has|have|was|were)\b|\bor not\b|\bshould i\b|လား|မလား|ရမလား|သင့်/i;

export function classifyQuestion(question: string): QuestionKind {
  const q = question.trim();
  if (!q) return 'open';
  if (WHEN.test(q)) return 'when';
  if (YES_NO.test(q)) return 'yesno';
  return 'open';
}

/** How favourable a card is when upright (+1 flowing, -1 hard, 0 mixed). Reversed flips and softens it. */
const FAVOURABLE = new Set([
  'major-01-magician', 'major-03-empress', 'major-06-lovers', 'major-07-chariot', 'major-08-strength',
  'major-10-wheel-of-fortune', 'major-11-justice', 'major-14-temperance', 'major-17-star', 'major-19-sun',
  'major-20-judgement', 'major-21-world', 'major-00-fool',
  'wands-01-ace', 'wands-03-three', 'wands-04-four', 'wands-06-six', 'wands-07-seven',
  'cups-01-ace', 'cups-02-two', 'cups-03-three', 'cups-06-six', 'cups-09-nine', 'cups-10-ten',
  'swords-01-ace', 'swords-06-six',
  'pentacles-01-ace', 'pentacles-03-three', 'pentacles-06-six', 'pentacles-09-nine', 'pentacles-10-ten',
]);
const HARD = new Set([
  'major-13-death', 'major-15-devil', 'major-16-tower', 'major-12-hanged-man',
  'wands-05-five', 'wands-09-nine', 'wands-10-ten',
  'cups-05-five', 'cups-07-seven', 'cups-08-eight',
  'swords-03-three', 'swords-05-five', 'swords-07-seven', 'swords-08-eight', 'swords-09-nine', 'swords-10-ten',
  'pentacles-04-four', 'pentacles-05-five',
]);

function cardScore(cardId: string, reversed: boolean): number {
  const base = FAVOURABLE.has(cardId) ? 1 : HARD.has(cardId) ? -1 : 0;
  if (!reversed) return base;
  return base === 0 ? -0.4 : -base * 0.6;
}

function verdictFor(drawn: readonly DrawnCard[]): Verdict {
  const n = drawn.length;
  // The final card is the outcome in every spread here, so it counts double.
  const total = drawn.reduce((sum, d, i) => sum + cardScore(d.cardId, d.reversed) * (i === n - 1 && n > 1 ? 2 : 1), 0);
  const avg = total / (n > 1 ? n + 1 : n);
  if (avg >= 0.6) return 'yes';
  if (avg >= 0.2) return 'leaningYes';
  if (avg > -0.2) return 'unclear';
  if (avg > -0.6) return 'leaningNo';
  return 'no';
}

const SUIT_TIMING: Record<Suit, Timing> = {
  wands: 'wands', swords: 'swords', cups: 'cups', pentacles: 'pentacles', major: 'major',
};

/**
 * A direct, rule-based response to the typed question: a yes/no leaning, a rough timing, or just the
 * card that speaks most to it. Health questions never get a verdict.
 */
export function answerQuestion(drawn: readonly DrawnCard[], question: string, topic: Topic): Answer | null {
  const last = drawn[drawn.length - 1];
  if (!last || !question.trim()) return null;
  const kind = classifyQuestion(question);
  const answer: Answer = { kind, keyCardId: last.cardId, keyReversed: last.reversed };
  if (kind === 'yesno' && topic !== 'health') answer.verdict = verdictFor(drawn);
  if (kind === 'when') {
    answer.timing = SUIT_TIMING[getCard(last.cardId)?.suit ?? 'major'];
    answer.delayed = drawn.filter((d) => d.reversed).length >= Math.ceil(drawn.length / 2);
  }
  return answer;
}
