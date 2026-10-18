import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { cardForPlanet, cardForSign } from '@/astro/astroCards';
import { computeChart } from '@/astro/chart';
import { bigThreeReading, planetName, zodiacName } from '@/astro/readings';
import { AppText, BackButton, Button, Card, Header, Screen } from '@/components';
import { BirthFormFields } from '@/components/BirthFormFields';
import { BigThreeCard, ChartHero, PlacementRow } from '@/components/BirthChartParts';
import { useBirthForm } from '@/hooks/useBirthForm';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { useToast } from '@/store/toast';
import { formatDate } from '@/utils/dates';
import { logError } from '@/utils/log';
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
  const form = useBirthForm({ birth });

  const num = (n: number, opts?: { grouping?: boolean }) => formatNumber(n, { burmeseNumerals: numerals, ...opts });

  const save = () => {
    const data = form.submit();
    if (!data) return;
    setBirth(data);
    setEditing(false);
    toast(t('chart.saved'));
  };

  const chart = useMemo(() => {
    if (!birth) return null;
    try {
      return computeChart({ date: birth.date, time: birth.time, place: birth.place });
    } catch (e) {
      logError('birth-chart.compute', e);
      return null;
    }
  }, [birth]);

  const summary = birth
    ? [
        formatDate(new Date(Number(birth.date.slice(0, 4)), Number(birth.date.slice(5, 7)) - 1, Number(birth.date.slice(8))), lang, { style: 'long', burmeseNumerals: numerals }),
        birth.time ? birth.time : null,
        birth.place.name,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

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
          <BirthFormFields form={form} />
          <Button label={t('chart.calculate')} onPress={save} testID="chart-save" />
          <AppText variant="caption" tone="textMuted">
            {t('chart.privacy')}
          </AppText>
        </Card>
      ) : null}

      {!editing && birth && !chart ? (
        <Card testID="chart-compute-error">
          <AppText tone="danger" accessibilityLiveRegion="polite">
            {t('chart.errorCompute')}
          </AppText>
          <Button label={t('chart.edit')} onPress={() => setEditing(true)} />
        </Card>
      ) : null}

      {!editing && birth && chart ? (
        <>
          <ChartHero
            chart={chart}
            lang={lang}
            wheelLabel={t('chart.wheelA11y')}
            summary={summary}
            note={!chart.timeKnown ? t('chart.noTimeNote') : undefined}
          />

          <AppText variant="heading" accessibilityRole="header">
            {t('chart.bigThree')}
          </AppText>
          {(['sun', 'moon'] as const).map((kind) => {
            const p = chart.planets.find((x) => x.id === kind)!;
            return (
              <BigThreeCard
                key={kind}
                testID={`chart-${kind}`}
                kind={kind}
                label={planetName(kind, lang)}
                sign={p.sign}
                lang={lang}
                reading={bigThreeReading(kind, p.sign, lang)}
                footnote={
                  kind === 'moon' && chart.moonSignAmbiguous
                    ? t('chart.moonMaybe', {
                        a: zodiacName(chart.moonSignAmbiguous[0], lang),
                        b: zodiacName(chart.moonSignAmbiguous[1], lang),
                      })
                    : undefined
                }
              />
            );
          })}
          {chart.ascendant ? (
            <BigThreeCard
              testID="chart-rising"
              kind="rising"
              label={t('chart.rising')}
              sign={chart.ascendant.sign}
              lang={lang}
              reading={bigThreeReading('rising', chart.ascendant.sign, lang)}
            />
          ) : null}

          <Card>
            <AppText variant="heading" accessibilityRole="header">
              {t('chart.placements')}
            </AppText>
            {chart.planets.map((p, i) => {
              const card = cardForPlanet(p.id) ?? cardForSign(p.sign);
              return (
                <PlacementRow
                  key={p.id}
                  planet={p}
                  lang={lang}
                  degree={`${num(p.degree)}°`}
                  houseLabel={p.house ? t('chart.house', { n: num(p.house) }) : undefined}
                  retrogradeLabel={t('chart.retrograde')}
                  last={i === chart.planets.length - 1}
                  cardLink={
                    card ? (
                      <Pressable onPress={() => openCard(card)} accessibilityRole="link" hitSlop={8}>
                        <AppText variant="label" tone="accent">
                          {t('chart.seeCard', { planet: planetName(p.id, lang) })}
                        </AppText>
                      </Pressable>
                    ) : null
                  }
                />
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
              form.reset();
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
