# Usage statistics and crash reports (PostHog)

Optional, anonymous, and off unless `POSTHOG_API_KEY` is set. Users can switch it off in
**Settings → Privacy → Share usage statistics** (on by default). While it is off the SDK is
never created, so the app does not contact PostHog.

## What is sent

| Kind | Where it comes from |
| --- | --- |
| `Application Installed` / `Updated` / `Opened` / `Became Active` / `Backgrounded` | SDK lifecycle events: installs, daily/weekly active users, retention |
| `$screen` | Every screen, named by its route pattern (`home`, `daily`, `reading/[spreadId]`, `journal/[id]`, …) — never a concrete journal ID |
| `$exception` | Uncaught JS errors and unhandled promise rejections, plus every error passed to `logError()` (property `scope`, `handled: true`) |
| Feature events | Listed in `src/analytics/index.ts` (`AnalyticsEvents`) |

Every event carries `language` (`en`/`my`) and `premium` (true/false), plus the SDK's app version,
OS, device model and GeoIP country.

**Never sent:** names, questions, notes, birth date/time/place, journal IDs, email. Event
properties are typed: adding one means editing `AnalyticsEvents`, which is where this rule is
checked in review.

Native (Java/Kotlin/NDK) crashes and ANRs aren't captured. Use Play Console → Android vitals for
those.

## Setup

1. Create a project at posthog.com and pick a region (US or EU).
2. Project settings:
   - **Discard client IP data**: on (the country is still worked out before the IP is discarded).
   - **Session replay**: off. **Autocapture / heatmaps**: irrelevant for mobile.
   - **Error tracking → Exception autocapture**: on.
3. Put the project API key (`phc_…`) and host into `.env` and EAS production env:
   ```bash
   eas env:create --environment production --name POSTHOG_API_KEY --value phc_... --visibility plaintext
   eas env:create --environment production --name POSTHOG_HOST --value https://us.i.posthog.com --visibility plaintext
   ```
4. New native modules (`expo-application`, `expo-device`) were added, so build a new binary. An
   OTA update isn't enough.
5. Update Play Console → App content → **Data safety** (answers in `STORE-LISTING.md` → Privacy
   answers), set a new `LEGAL_EFFECTIVE_DATE`, and run `npm run legal:export` so the website copy
   of the privacy policy matches.

## Useful dashboards

- **Installs & actives**: Trends on `Application Installed` (total count) and `Application Opened`
  (unique users, daily / weekly).
- **Retention**: Retention insight, start event `Application Installed`, return event
  `Application Opened`.
- **Feature use**: Trends on `$screen` broken down by `$screen_name`, and on `reading_completed`
  broken down by `spread`.
- **Onboarding funnel**: `Application Installed` → `onboarding_completed` → `reading_completed`.
- **Premium funnel**: `paywall_viewed` (break down by `source`) → `purchase_completed`.
- **Crashes**: Error tracking, grouped by issue; filter `handled = true` to separate logged errors.
