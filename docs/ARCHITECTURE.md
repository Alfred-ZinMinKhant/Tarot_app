# Architecture

_Last updated: Phase 1 (scaffold, theme, i18n, fonts, navigation shell)._

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 (strict + `noUncheckedIndexedAccess`) |
| Navigation | expo-router (file-based), root `Stack` + `(tabs)` with `expo-router/js-tabs` |
| State | Zustand + `persist` middleware on AsyncStorage |
| i18n | i18next + react-i18next, device locale via expo-localization |
| Fonts | Noto Sans Myanmar + Padauk (bundled TTF, SIL OFL), loaded with expo-font at startup |
| Tests | Jest (`jest-expo` preset) + React Native Testing Library 13 + `expo-router/testing-library` |

Later phases add expo-sqlite (journal), expo-crypto (draws), reanimated/gesture-handler (card animations), expo-notifications, view-shot + sharing.

## Directory layout

```
app/                     expo-router routes (screens only)
  _layout.tsx            root: font loading, settings hydration, i18n, theme, Stack
  index.tsx              redirect → onboarding or /home
  (onboarding)/          welcome, language
  (tabs)/                home, library, journal, learn, settings
src/
  components/            design-system primitives (AppText, Button, Card, Chip, …)
  config/brand.json      app name (en + my) and store identifiers — single source of truth
  hooks/                 useLanguage, useAppFonts, useSettingsHydrated
  i18n/                  i18next instance, language helpers, typed keys
  store/                 Zustand stores (settings, font status)
  theme/                 colors, typography, spacing, ThemeContext
  utils/                 myanmar (syllable breaking), numbers, dates
locales/                 en.json, my.json, my.review.json
scripts/                 check-i18n.ts (+ lib/ shared with tests)
docs/                    this file, DECISIONS, glossary, assets
__tests__/               Jest suites
```

Non-route code never lives under `app/`.

## Startup sequence

1. `SplashScreen.preventAutoHideAsync()`.
2. `useAppFonts` loads Noto Sans Myanmar and Padauk independently (`Promise.allSettled`); the list of
   families that loaded goes into `useFontStatus`. If Noto fails, Padauk is used automatically.
3. `useSettingsHydrated` waits for the persisted settings (via `useSyncExternalStore`).
4. `initI18n(language)` creates the i18next instance once; afterwards a `useEffect` calls
   `changeLanguage` whenever the active language changes, so every `useTranslation()` consumer
   re-renders instantly — no restart.
5. Splash hides; `app/index.tsx` redirects to onboarding or Home.

## Language model

- `settings.language` is `'en' | 'my' | null`. `null` means "follow the device"
  (`my*` locale → Burmese, anything else → English); `useLanguage()` resolves it.
- The app name is injected into both resource bundles from `src/config/brand.json` as the
  `appName` key, and strings reference it with i18next nesting: `$t(appName)`.
- `npm run check:i18n` (also part of `npm run validate` and the Jest suite) fails when keys,
  `{{placeholders}}` or `$t()` references differ between `en.json` and `my.json`, when a value is
  empty, or when a Burmese key is missing from `my.review.json`.

## Burmese text rendering

`AppText` is the only text primitive screens use. For every string it decides the script:

- **Myanmar** if the UI language is Burmese *or* the string contains Myanmar code points
  (so `မြန်မာ` in the English UI still uses the bundled font, never a possibly-Zawgyi system font);
- **Latin** otherwise (platform system font).

For Myanmar it applies the bundled font family (separate bold face, no synthetic bold), a 1.8×
line-height (Noto's ascent+descent is ~2.18 em; 1.6 is the floor) and runs `breakBurmese()`, which
inserts U+200B at syllable boundaries so text wraps by syllable. The accessibility label is set to the
original string without zero-width spaces. Buttons and chips let labels wrap instead of truncating.

Utilities (all Intl-free so output is identical on Hermes without ICU locale data):

- `breakBurmese`, `stripZwsp`, `burmeseSyllables`, `containsMyanmar` — `src/utils/myanmar.ts`
- `formatNumber` (Latin / Burmese digits) — `src/utils/numbers.ts`
- `formatDate`, `formatTime`, `timeOfDay`, `localDateKey` — `src/utils/dates.ts`

## Theming

`AppThemeProvider` combines the system colour scheme with `settings.themeMode`, the S/M/L font size
setting and the resolved Myanmar font. Colour tokens live in `src/theme/colors.ts`; a Jest suite
asserts WCAG AA (≥ 4.5:1) for every text/background pair in both themes. Minimum tap target is 44 dp.

## Testing & checks

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint 9 flat config), zero warnings allowed |
| `npm run validate` | locale checks (card-data validation joins in Phase 2) |
| `npm test` | Jest: utils, locale parity, contrast, and full-router integration tests |
| `npm run ci` | all of the above; also run by `.github/workflows/ci.yml` |
