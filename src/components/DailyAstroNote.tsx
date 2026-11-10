import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { computeChart } from '@/astro/chart';
import { dailyAstroLink } from '@/astro/dailyLink';
import { ELEMENT_LABELS, ZODIAC_LABELS } from '@/data/deck';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { logError } from '@/utils/log';

import { AppText } from './AppText';
import { Card } from './Card';

/** One line tying today's card to the person's birth chart, only when a real link exists. */
export function DailyAstroNote({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const birth = useSettings((s) => s.birth);
  const link = useMemo(() => {
    if (!birth) return null;
    try {
      return dailyAstroLink(cardId, computeChart(birth));
    } catch (e) {
      logError('daily-astro', e);
      return null;
    }
  }, [birth, cardId]);
  if (!link) return null;
  const params = {
    sign: 'sign' in link ? ZODIAC_LABELS[link.sign][lang] : '',
    element: 'element' in link ? ELEMENT_LABELS[link.element][lang] : '',
  };
  return (
    <Card testID="daily-astro">
      <AppText variant="heading">{t('daily.astroTitle')}</AppText>
      <AppText>{t(`daily.astro.${link.kind}`, params)}</AppText>
    </Card>
  );
}
