import Constants from 'expo-constants';

import crisis from '@/config/crisis.json';
import { stripZwsp } from '@/utils/myanmar';

const normalise = (text: string) => stripZwsp(text).normalize('NFC').toLowerCase().replace(/[\s ]+/g, ' ').trim();

const PHRASES = [...crisis.en, ...crisis.my].map(normalise);

/**
 * True when a question contains a self-harm or crisis phrase (English or Burmese). Spaces are
 * ignored for Burmese phrases, which are often typed with or without them.
 */
export function detectCrisis(text: string, phrases: readonly string[] = PHRASES): boolean {
  const t = normalise(text);
  if (!t) return false;
  const compact = t.replace(/ /g, '');
  return phrases.some((p) => t.includes(p) || (/[က-႟]/.test(p) && compact.includes(p.replace(/ /g, ''))));
}

export type Helpline = { name: string; phone: string; url: string };

/** Helpline details from app config (.env → app.config.ts → extra). Empty when not configured. */
export function configuredHelpline(): Helpline | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { crisisHelpline?: Partial<Helpline> };
  const h = extra.crisisHelpline ?? {};
  const name = h.name?.trim() ?? '';
  const phone = h.phone?.trim() ?? '';
  const url = h.url?.trim() ?? '';
  return name && (phone || url) ? { name, phone, url } : null;
}
