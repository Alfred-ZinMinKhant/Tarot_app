import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';

import { analyticsConfig } from '@/config/analytics';

import type { AnalyticsService } from './service';

/**
 * PostHog-backed analytics, or null when this build has no PostHog key.
 * Anonymous only: no person profiles, no session replay, no touch autocapture. Called only when
 * the user has usage statistics switched on, so a switched-off install never contacts PostHog.
 */
export function posthogService(): AnalyticsService | null {
  const config = analyticsConfig();
  if (!config) return null;
  const client = new PostHog(config.apiKey, {
    host: config.host,
    customStorage: AsyncStorage,
    // Application Installed / Updated / Opened: installs and daily active users.
    captureAppLifecycleEvents: true,
    personProfiles: 'never',
    enableSessionReplay: false,
    // Feature flags and surveys are unused; skip the extra network calls.
    preloadFeatureFlags: false,
    disableSurveys: true,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false } },
  });
  // Clears an opt-out persisted by an earlier "off" so switching back on takes effect.
  void client.optIn();

  return {
    capture: (event, props) => void client.capture(event, props),
    screen: (name) => void client.screen(name),
    register: (props) => void client.register(props),
    captureException: (error, props) => client.captureException(error, props),
    setEnabled: (enabled) => void (enabled ? client.optIn() : client.optOut()),
    reset: () => client.reset(),
  };
}
