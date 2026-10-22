import { useTranslation } from 'react-i18next';

import { getCard } from '@/data/cards';
import { type Answer, readingText, type Topic } from '@/engine';
import { useLanguage } from '@/hooks/useLanguage';
import { topicTint } from '@/theme/topicTheme';

import { AppText } from '../AppText';
import { Card } from '../Card';

type Props = { answer: Answer; question: string; topic: Topic };

/** The first sentence, so the answer stays short; the full text is in the card's own section above. */
const firstSentence = (text: string) => text.split(/(?<=[.။!?])\s+/)[0] ?? text;

/** A direct response to the typed question: a yes/no leaning or timing, plus the card that speaks most to it. */
export function AnswerCard({ answer, question, topic }: Props) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const tint = topicTint(topic);
  const card = getCard(answer.keyCardId)!;
  return (
    <Card testID="reading-answer" style={tint ? { borderColor: tint, borderWidth: 1 } : undefined}>
      <AppText variant="heading">{t('reading.answer.title')}</AppText>
      <AppText tone="textMuted">“{question.trim()}”</AppText>
      <AppText>{t(`reading.answer.intro.${answer.kind}`)}</AppText>
      {answer.verdict ? (
        <AppText bold testID="reading-answer-verdict">
          {t(`reading.answer.verdict.${answer.verdict}`)}
        </AppText>
      ) : null}
      {answer.timing ? (
        <AppText bold testID="reading-answer-timing">
          {t(`reading.answer.timing.${answer.timing}`)}
          {answer.delayed ? ` ${t('reading.answer.delayed')}` : ''}
        </AppText>
      ) : null}
      <AppText>
        {t('reading.answer.keyCard', {
          card: card[lang].name,
          reversed: answer.keyReversed ? t('reading.answer.reversedSuffix') : '',
          text: firstSentence(readingText(card, answer.keyReversed, topic, lang)),
        })}
      </AppText>
      <AppText variant="caption" tone="textMuted">
        {t(topic === 'health' ? 'reading.answer.healthNote' : 'reading.answer.disclaimer')}
      </AppText>
    </Card>
  );
}
