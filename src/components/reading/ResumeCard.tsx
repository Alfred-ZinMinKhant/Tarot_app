import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { spacing } from '@/theme/spacing';

import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';

type Props = { onContinue: () => void; onDiscard: () => void };

/** Offered on the setup step when an unfinished reading of this spread was saved. */
export function ResumeCard({ onContinue, onDiscard }: Props) {
  const { t } = useTranslation();
  return (
    <Card testID="reading-resume">
      <AppText variant="heading" accessibilityRole="header">
        {t('reading.resumeTitle')}
      </AppText>
      <AppText tone="textMuted">{t('reading.resumeBody')}</AppText>
      <View style={{ gap: spacing.sm }}>
        <Button label={t('reading.resumeContinue')} onPress={onContinue} testID="reading-resume-continue" />
        <Button
          label={t('reading.resumeDiscard')}
          variant="ghost"
          onPress={onDiscard}
          testID="reading-resume-discard"
        />
      </View>
    </Card>
  );
}
