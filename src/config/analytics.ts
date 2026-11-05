import Constants from 'expo-constants';

export type AnalyticsConfig = { apiKey: string; host: string };

type Extra = { analytics?: { apiKey?: string; host?: string } };

/**
 * PostHog settings (.env → app.config.ts → extra.analytics). Null when no key is set: the build
 * then sends no usage events or error reports at all.
 */
export function analyticsConfig(): AnalyticsConfig | null {
  const a = ((Constants.expoConfig?.extra ?? {}) as Extra).analytics ?? {};
  if (!a.apiKey) return null;
  return { apiKey: a.apiKey, host: a.host || 'https://us.i.posthog.com' };
}
