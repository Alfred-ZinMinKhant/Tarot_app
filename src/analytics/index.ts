/**
 * Anonymous usage statistics and error reports (PostHog). Only builds with POSTHOG_API_KEY send
 * anything, and only while Settings → Usage statistics is on.
 *
 * Privacy rule: events say *which* feature was used, never *what* the user wrote. No names,
 * questions, notes, birth details or journal IDs ever go in an event.
 */
import { setErrorSink } from '@/utils/log';

import type { AnalyticsService, EventProps } from './service';

/** Every event the app sends, with its properties. Keep this list short and stable. */
export type AnalyticsEvents = {
  // Screens (Card of the Day, journal, library, birth chart, ...) are counted by `trackScreen`.
  onboarding_completed: { sign_chosen: boolean; chart_entered: boolean; reminder_on: boolean };
  reading_completed: { spread: string; topic: string; asked_question: boolean };
  card_opened: { card: string };
  portrait_preview: { card: string };
  lesson_opened: { lesson: string };
  birth_chart_saved: { has_time: boolean };
  image_shared: { method: 'share' | 'save' };
  paywall_viewed: { source: string };
  purchase_completed: { package: string };
  purchase_restored: { premium: boolean };
  rewarded_ad_watched: { reward: 'spread' | 'shares' };
  reminder_toggled: { enabled: boolean };
  cloud_backup_signed_in: Record<string, never>;
  data_exported: Record<string, never>;
};

type Factory = () => AnalyticsService | null;

let factory: Factory | null = null;
/** undefined = not started (switched off, or before settings load); null = this build has none. */
let service: AnalyticsService | null | undefined;
let enabled = false;

/** Test hook: inject a fake service (or null) directly. */
export function setAnalyticsService(next: AnalyticsService | null | undefined): void {
  service = next;
  enabled = !!next;
}

/**
 * Applies the Settings switch. The SDK is created the first time it is switched on, so an install
 * that turned statistics off never contacts PostHog.
 */
export function setAnalyticsEnabled(on: boolean, create?: Factory): void {
  if (create) factory = create;
  const changed = enabled !== on;
  enabled = on;
  if (on && service === undefined && factory) {
    try {
      service = factory();
    } catch {
      service = null;
    }
    if (service) setErrorSink((scope, error) => service?.captureException(error, { scope, handled: true }));
    return;
  }
  if (changed) service?.setEnabled(on);
}

const active = (): AnalyticsService | null => (enabled && service ? service : null);

export function track<E extends keyof AnalyticsEvents>(
  event: E,
  ...props: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]
): void {
  active()?.capture(event, props[0] as EventProps | undefined);
}

export function trackScreen(name: string): void {
  active()?.screen(name);
}

export function registerAnalyticsProps(props: EventProps): void {
  active()?.register(props);
}

/** New anonymous ID, so earlier events can't be tied to this install after "Delete my data". */
export function resetAnalytics(): void {
  service?.reset();
}
