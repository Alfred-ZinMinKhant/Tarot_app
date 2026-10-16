import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { cardForPlanet, cardForSign } from '@/astro/astroCards';
import { isBirthDate } from '@/astro/birth';
import { computeChart } from '@/astro/chart';
import { searchPlaces, type Place } from '@/astro/places';
import { bigThreeReading, placementLine, planetMeaning, planetName, zodiacName } from '@/astro/readings';
import { AppText, BackButton, Button, Card, Chip, Header, Screen } from '@/components';
import { ChartWheel } from '@/components/ChartWheel';
import { TextField } from '@/components/TextField';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';
import { pad2 } from '@/utils/dates';
import { formatNumber } from '@/utils/numbers';

/** Birth chart: enter a birth date, optional time and place; see Sun, Moon, Rising and the planets. */
export default function BirthChartScreen() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const birth = useSettings((s) => s.birth);
  const setBirth = useSettings((s) => s.setBirth);
  const numerals = useSettings((s) => s.burmeseNumerals);
  const [editing, setEditing] = useState(!birth);

  const [day, setDay] = useState(birth ? String(Number(birth.date.slice(8))) : '');
  const [month, setMonth] = useState(birth ? String(Number(birth.date.slice(5, 7))) : '');
  const [year, setYear] = useState(birth ? birth.date.slice(0, 4) : '');
  const [unknownTime, setUnknownTime] = useState(birth ? birth.time === null : false);
  const [hour, setHour] = useState(birth?.time ? String(Number(birth.time.slice(0, 2))) : '');
  const [minute, setMinute] = useState(birth?.time ? String(Number(birth.time.slice(3))) : '');
  const [query, setQuery] = useState(birth ? birth.place.name : '');
  const [place, setPlace] = useState<Place | null>(birth?.place ?? null);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => (place && place.name === query ? [] : searchPlaces(query)), [query, place]);
  const num = (n: number, opts?: { grouping?: boolean }) => formatNumber(n, { burmeseNumerals: numerals, ...opts });

  const save = () => {
    const date = `${year.padStart(4, '0')}-${pad2(Number(month))}-${pad2(Number(day))}`;
    if (!isBirthDate(date)) return setError(t('chart.errorDate'));
    let time: string | null = null;
    if (!unknownTime) {
      const h = Number(hour);
      const m = Number(minute || '0');
      if (hour === '' || !Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
        return setError(t('chart.errorTime', { n: num(24), h: num(14), m: num(30) }));
      }
      time = `${pad2(h)}:${pad2(m)}`;
    }
    if (!place) return setError(t('chart.errorPlace'));
    setError(null);
    setBirth({ date, time, place });
    setEditing(false);
    toast(t('chart.saved'));
  };

  const chart = useMemo(() => {
    if (!birth) return null;
    try {
      return computeChart({ date: birth.date, time: birth.time, place: birth.place });
    } catch {
      return null;
    }
  }, [birth]);

  const openCard = (id?: string) => id && router.push({ pathname: '/card/[id]', params: { id } });

  return (
    <Screen testID="screen-birth-chart">
      <BackButton fallback="/home" />
      <Header title={t('chart.title')} subtitle={t('chart.subtitle')} />

      {editing || !birth ? (
        <Card testID="chart-form">
          <AppText variant="heading" accessibilityRole="header">
            {t('chart.formTitle')}
          </AppText>
          <View style={styles.row}>
            <View style={styles.field}>
              <TextField label={t('sign.day')} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} placeholder={num(15)} testID="chart-day" />
            </View>
            <View style={styles.field}>
              <TextField label={t('sign.month')} value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} placeholder={num(6)} testID="chart-month" />
            </View>
            <View style={styles.yearField}>
              <TextField label={t('sign.year')} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder={num(1995, { grouping: false })} testID="chart-year" />
            </View>
          </View>

          {unknownTime ? null : (
            <View style={styles.row}>
              <View style={styles.field}>
                <TextField label={t('chart.hour')} value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} placeholder={num(14)} hint={t('chart.hour24', { n: num(24), from: num(0), to: num(23) })} testID="chart-hour" />
              </View>
              <View style={styles.field}>
                <TextField label={t('chart.minute')} value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} placeholder={num(30)} testID="chart-minute" />
              </View>
            </View>
          )}
          <Chip label={t('chart.unknownTime')} selected={unknownTime} onPress={() => setUnknownTime(!unknownTime)} testID="chart-unknown-time" />
          <AppText variant="caption" tone="textMuted">
            {t(unknownTime ? 'chart.unknownTimeHint' : 'chart.timeHint')}
          </AppText>

          <TextField
            label={t('chart.place')}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setPlace(null);
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
                  setPlace(p);
                  setQuery(p.name);
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
          {error ? (
            <AppText tone="danger" accessibilityLiveRegion="polite" testID="chart-error">
              {error}
            </AppText>
          ) : null}
          <Button label={t('chart.calculate')} onPress={save} testID="chart-save" />
          <AppText variant="caption" tone="textMuted">
            {t('chart.privacy')}
          </AppText>
        </Card>
      ) : null}

      {!editing && birth && chart ? (
        <>
          <Card testID="chart-result">
            <View style={styles.center}>
              <ChartWheel chart={chart} accessibilityLabel={t('chart.wheelA11y')} />
            </View>
            {!chart.timeKnown ? (
              <AppText variant="caption" tone="textMuted">
                {t('chart.noTimeNote')}
              </AppText>
            ) : null}
          </Card>

          <Card>
            <AppText variant="heading" accessibilityRole="header">
              {t('chart.bigThree')}
            </AppText>
            {(['sun', 'moon'] as const).map((kind) => {
              const p = chart.planets.find((x) => x.id === kind)!;
              return (
                <View key={kind} style={styles.block} testID={`chart-${kind}`}>
                  <AppText bold>{placementLine(p, lang)}</AppText>
                  <AppText>{bigThreeReading(kind, p.sign, lang)}</AppText>
                  {kind === 'moon' && chart.moonSignAmbiguous ? (
                    <AppText variant="caption" tone="textMuted">
                      {t('chart.moonMaybe', {
                        a: zodiacName(chart.moonSignAmbiguous[0], lang),
                        b: zodiacName(chart.moonSignAmbiguous[1], lang),
                      })}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
            {chart.ascendant ? (
              <View style={styles.block} testID="chart-rising">
                <AppText bold>{`${t('chart.rising')} · ${zodiacName(chart.ascendant.sign, lang)}`}</AppText>
                <AppText>{bigThreeReading('rising', chart.ascendant.sign, lang)}</AppText>
              </View>
            ) : null}
          </Card>

          <Card>
            <AppText variant="heading" accessibilityRole="header">
              {t('chart.placements')}
            </AppText>
            {chart.planets.map((p) => {
              const card = cardForPlanet(p.id) ?? cardForSign(p.sign);
              return (
                <View key={p.id} style={styles.block} testID={`chart-planet-${p.id}`}>
                  <AppText bold>
                    {placementLine(p, lang)}
                    {` · ${num(p.degree)}°`}
                    {p.retrograde && p.id !== 'node' ? ` · ${t('chart.retrograde')}` : ''}
                    {p.house ? ` · ${t('chart.house', { n: num(p.house) })}` : ''}
                  </AppText>
                  <AppText variant="caption" tone="textMuted">
                    {planetMeaning(p.id, lang)}
                  </AppText>
                  {card ? (
                    <Pressable onPress={() => openCard(card)} accessibilityRole="link" hitSlop={8}>
                      <AppText variant="label" tone="accent">
                        {t('chart.seeCard', { planet: planetName(p.id, lang) })}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </Card>

          <Button label={t('chart.edit')} variant="ghost" onPress={() => setEditing(true)} testID="chart-edit" />
          <Button
            label={t('chart.clear')}
            variant="ghost"
            onPress={() => {
              setBirth(null);
              setEditing(true);
              setDay('');
              setMonth('');
              setYear('');
              setHour('');
              setMinute('');
              setQuery('');
              setPlace(null);
            }}
            testID="chart-clear"
          />
        </>
      ) : null}

      <AppText variant="caption" tone="textMuted" center>
        {t('chart.disclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  yearField: { flex: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  center: { alignItems: 'center' },
  block: { gap: 2, paddingVertical: spacing.xs },
});
