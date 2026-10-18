import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { searchPlaces } from '@/astro/places';
import type { BirthForm } from '@/hooks/useBirthForm';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';
import { Chip } from './Chip';
import { TextField } from './TextField';

/** Date, optional time and place inputs for the birth chart. State lives in `useBirthForm`. */
export function BirthFormFields({ form }: { form: BirthForm }) {
  const { t } = useTranslation();
  const num = useNumberFormat();
  const { place, query } = form;
  const matches = useMemo(() => (place && place.name === query ? [] : searchPlaces(query)), [query, place]);

  return (
    <>
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField label={t('sign.day')} value={form.day} onChangeText={form.setDay} keyboardType="number-pad" maxLength={2} placeholder={num(15)} testID="chart-day" />
        </View>
        <View style={styles.field}>
          <TextField label={t('sign.month')} value={form.month} onChangeText={form.setMonth} keyboardType="number-pad" maxLength={2} placeholder={num(6)} testID="chart-month" />
        </View>
        <View style={styles.yearField}>
          <TextField label={t('sign.year')} value={form.year} onChangeText={form.setYear} keyboardType="number-pad" maxLength={4} placeholder={num(1995, { grouping: false })} testID="chart-year" />
        </View>
      </View>

      {form.unknownTime ? null : (
        <View style={styles.row}>
          <View style={styles.field}>
            <TextField label={t('chart.hour')} value={form.hour} onChangeText={form.setHour} keyboardType="number-pad" maxLength={2} placeholder={num(14)} hint={t('chart.hour24', { n: num(24), from: num(0), to: num(23) })} testID="chart-hour" />
          </View>
          <View style={styles.field}>
            <TextField label={t('chart.minute')} value={form.minute} onChangeText={form.setMinute} keyboardType="number-pad" maxLength={2} placeholder={num(30)} testID="chart-minute" />
          </View>
        </View>
      )}
      <Chip label={t('chart.unknownTime')} selected={form.unknownTime} onPress={() => form.setUnknownTime(!form.unknownTime)} testID="chart-unknown-time" />
      <AppText variant="caption" tone="textMuted">
        {t(form.unknownTime ? 'chart.unknownTimeHint' : 'chart.timeHint')}
      </AppText>

      <TextField
        label={t('chart.place')}
        value={form.query}
        onChangeText={(v) => {
          form.setQuery(v);
          form.setPlace(null);
        }}
        placeholder={t('chart.placePlaceholder')}
        hint={t('chart.placeHint')}
        autoCapitalize="words"
        testID="chart-place"
      />
      <View style={styles.chips}>
        {matches.map((p) => (
          <Chip
            key={`${p.name}-${p.country}-${p.latitude}`}
            label={`${p.name}, ${p.country}`}
            onPress={() => {
              form.setPlace(p);
              form.setQuery(p.name);
            }}
            testID={`chart-place-${p.name}`}
          />
        ))}
      </View>
      {place ? (
        <AppText variant="caption" tone="textMuted">
          {t('chart.placeChosen', { place: `${place.name}, ${place.country}`, zone: place.timeZone })}
        </AppText>
      ) : null}
      {form.error ? (
        <AppText tone="danger" accessibilityLiveRegion="polite" testID="chart-error">
          {form.error}
        </AppText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  yearField: { flex: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
