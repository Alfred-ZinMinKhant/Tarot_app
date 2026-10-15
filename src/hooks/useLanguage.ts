import { deviceLanguage } from '@/i18n';
import type { Language } from '@/i18n/languages';
import { useSettings } from '@/store/settings';

/** The active app language: the user's explicit choice, or the device locale. */
export function useLanguage(): Language {
  const chosen = useSettings((s) => s.language);
  return chosen ?? deviceLanguage();
}
