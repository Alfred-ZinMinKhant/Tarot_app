import type { Topic } from '@/engine';

import { palette } from './colors';

/** Accent colour per reading topic (tints card backs, borders and the topic chip). */
const TOPIC_ACCENT: Record<Topic, string> = {
  general: palette.gold,
  love: palette.rose,
  career: '#7C8CF0',
  money: palette.gold,
  health: palette.teal,
  question: palette.gold,
};

export function topicAccent(topic: Topic): string {
  return TOPIC_ACCENT[topic];
}

/** The card-back tint for a topic: only the four life areas get one; general/question keep the plain back. */
export function topicTint(topic: Topic): string | undefined {
  return topic === 'general' || topic === 'question' ? undefined : TOPIC_ACCENT[topic];
}
