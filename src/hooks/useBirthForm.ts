import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isBirthDate, type BirthData } from '@/astro/birth';
import type { Place } from '@/astro/places';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { pad2 } from '@/utils/dates';
import { toLatinDigits } from '@/utils/numbers';

/** Form state for the birth-chart inputs, shared by the chart screen and the last onboarding step. */
export function useBirthForm(initial: { birth?: BirthData | null; date?: string | null } = {}) {
  const { t } = useTranslation();
  const fmt = useNumberFormat();
  const birth = initial.birth ?? null;
  const seed = birth?.date ?? initial.date ?? null;

  const [day, setDay] = useState(seed ? String(Number(seed.slice(8))) : '');
  const [month, setMonth] = useState(seed ? String(Number(seed.slice(5, 7))) : '');
  const [year, setYear] = useState(seed ? seed.slice(0, 4) : '');
  const [unknownTime, setUnknownTime] = useState(birth ? birth.time === null : false);
  const [hour, setHour] = useState(birth?.time ? String(Number(birth.time.slice(0, 2))) : '');
  const [minute, setMinute] = useState(birth?.time ? String(Number(birth.time.slice(3))) : '');
  const [query, setQuery] = useState(birth ? birth.place.name : '');
  const [place, setPlace] = useState<Place | null>(birth?.place ?? null);
  const [error, setError] = useState<string | null>(null);

  /** Returns the validated birth data, or null after setting `error`. */
  const submit = (): BirthData | null => {
    // Digits typed on a Myanmar keyboard (၁၅) count the same as Latin ones.
    const [dd, mm, yyyy, hh, min] = [day, month, year, hour, minute].map((v) => toLatinDigits(v.trim()));
    const date = `${yyyy!.padStart(4, '0')}-${pad2(Number(mm))}-${pad2(Number(dd))}`;
    const fail = (message: string) => {
      setError(message);
      return null;
    };
    if (!isBirthDate(date)) return fail(t('chart.errorDate'));
    let time: string | null = null;
    if (!unknownTime) {
      const h = Number(hh);
      const m = Number(min || '0');
      if (hh === '' || !Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
        return fail(t('chart.errorTime', { n: fmt(24), h: fmt(14), m: fmt(30) }));
      }
      time = `${pad2(h)}:${pad2(m)}`;
    }
    if (!place) return fail(t('chart.errorPlace'));
    setError(null);
    return { date, time, place };
  };

  const reset = () => {
    setDay('');
    setMonth('');
    setYear('');
    setHour('');
    setMinute('');
    setQuery('');
    setPlace(null);
  };

  return {
    day, setDay, month, setMonth, year, setYear,
    unknownTime, setUnknownTime, hour, setHour, minute, setMinute,
    query, setQuery, place, setPlace, error, submit, reset,
  };
}

export type BirthForm = ReturnType<typeof useBirthForm>;
