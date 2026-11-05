import type { AnalyticsService } from './service';

/** No analytics in the web preview (used for store screenshots). */
export function posthogService(): AnalyticsService | null {
  return null;
}
