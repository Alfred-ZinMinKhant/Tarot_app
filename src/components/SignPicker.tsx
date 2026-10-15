import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SIGNS, type SignId, signForBirthDate } from '@/data/content';
import { useLanguage } from '@/hooks/useLanguage';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { spacing } from '@/theme/spacing';
import { WEEKDAYS } from '@/utils/dates';
import { toLatinDigits } from '@/utils/numbers';

import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { SettingRow } from './SettingRow';
import { TextField } from './TextField';

type Props = {
  value: SignId | null;
  onChange: (sign: SignId) => void;
  testID?: string;
};

/** Choose a weekday sign directly, or work it out from a birth date. */
export function SignPicker({ value, onChange, testID = 'sign-picker' }: Props) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const fmt = useNumberFormat();
  const [finding, setFinding] = useState(false);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [afternoon, setAfternoon] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Accept Burmese digits typed on a Myanmar keyboard as well as Latin ones.
  const num = (s: string) => Number.parseInt(toLatinDigits(s.trim()), 10);

  const find = () => {
    const sign = signForBirthDate(num(year), num(month), num(day), afternoon);
    if (!sign) {
      setMessage(t('sign.dateInvalid'));
      return;
    }
    const weekday = new Date(num(year), num(month) - 1, num(day), 12).getDay();
    setMessage(t('sign.dateResult', { weekday: WEEKDAYS[lang][weekday] }));
    onChange(sign);
  };

  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('sign.choose')}>
        {SIGNS.map((s) => (
          <Chip
            key={s.id}
            label={s[lang].name}
            accessibilityLabel={`${s[lang].name}, ${s[lang].animal}`}
            selected={s.id === value}
            onPress={() => onChange(s.id)}
            testID={`${testID}-${s.id}`}
          />
        ))}
      </View>
      <AppText variant="caption" tone="textMuted">
        {t('sign.wednesdayHint')}
      </AppText>
      {finding ? (
        <View style={styles.finder} testID={`${testID}-finder`}>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <TextField
                label={t('sign.day')}
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
                placeholder={fmt(15)}
                testID={`${testID}-day`}
              />
            </View>
            <View style={styles.dateField}>
              <TextField
                label={t('sign.month')}
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
                placeholder={fmt(6)}
                testID={`${testID}-month`}
              />
            </View>
            <View style={styles.yearField}>
              <TextField
                label={t('sign.year')}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder={fmt(1995, { grouping: false })}
                testID={`${testID}-year`}
              />
            </View>
          </View>
          <SettingRow
            label={t('sign.afternoon')}
            description={t('sign.afternoonHint')}
            value={afternoon}
            onValueChange={setAfternoon}
            testID={`${testID}-afternoon`}
          />
          <Button label={t('sign.findButton')} variant="secondary" onPress={find} testID={`${testID}-find`} />
          {message ? (
            <AppText accessibilityLiveRegion="polite" testID={`${testID}-message`}>
              {message}
            </AppText>
          ) : null}
        </View>
      ) : (
        <Button
          label={t('sign.findByDate')}
          variant="ghost"
          onPress={() => setFinding(true)}
          testID={`${testID}-open-finder`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  finder: { gap: spacing.md },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateField: { flex: 1 },
  yearField: { flex: 1.5 },
});
