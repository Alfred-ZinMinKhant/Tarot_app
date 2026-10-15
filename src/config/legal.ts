import Constants from 'expo-constants';

import type { LegalVar } from '@/data/content';
import type { Language } from '@/i18n/languages';

import brand from './brand.json';

export type LegalConfig = { publisher: string; contactEmail: string; effectiveDate: Date | null };

/** Publisher details from app config (.env → app.config.ts → extra.legal). */
export function legalConfig(): LegalConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { legal?: Partial<Record<string, string>> };
  const l = extra.legal ?? {};
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(l.effectiveDate?.trim() ?? '');
  const effectiveDate = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  return {
    publisher: l.publisher?.trim() ?? '',
    contactEmail: l.contactEmail?.trim() ?? '',
    effectiveDate: effectiveDate && !Number.isNaN(effectiveDate.getTime()) ? effectiveDate : null,
  };
}

export function legalVars(lang: Language, config = legalConfig()): Partial<Record<LegalVar, string>> {
  return { appName: brand.appName[lang], publisher: config.publisher, contactEmail: config.contactEmail };
}
