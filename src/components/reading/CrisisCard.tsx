import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { configuredHelpline } from '@/engine';
import { radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';

import { AppText } from '../AppText';
import { Button } from '../Button';

/** Shown instead of a reading when the question suggests the person may be in distress. */
export function CrisisCard({ onEdit }: { onEdit: () => void }) {
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
  crisis: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
});
