import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, BackButton, Card, EmptyState, Header, Screen } from '@/components';
import { legalConfig, legalVars } from '@/config/legal';
import { isLegalDoc, renderLegal } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { formatDate } from '@/utils/dates';

/** Privacy Policy and Terms of Use, in the current language. */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useTranslation();
  const lang = useLanguage();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);

  if (!isLegalDoc(doc)) {
    return (
      <Screen testID="screen-legal-missing">
        <BackButton fallback="/settings" />
        <EmptyState icon="settings" title={t('legal.notFound')} />
      </Screen>
    );
  }

  const config = legalConfig();
  const page = renderLegal(doc, lang, legalVars(lang, config));
  return (
    <Screen testID={`screen-legal-${doc}`}>
      <BackButton fallback="/settings" />
      <Header
        title={page.title}
        subtitle={
          config.effectiveDate
            ? t('legal.effective', { date: formatDate(config.effectiveDate, lang, { style: 'long', burmeseNumerals }) })
            : undefined
        }
      />
      {page.sections.map((s) => (
        <Card key={s.heading}>
          <AppText variant="heading" accessibilityRole="header">
            {s.heading}
          </AppText>
          <AppText>{s.body}</AppText>
        </Card>
      ))}
    </Screen>
  );
}
