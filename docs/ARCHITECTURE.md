# Architecture

_Last updated: Phase 3 (reading engine, spreads, reading UI and animations)._

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
  (tabs)/                home, library (FlashList grid + filters + search), journal, learn, settings
  card/[id].tsx          card detail: all meanings, upright/reversed toggle
  reading/[spreadId].tsx reading flow: topic + question → shuffle → pick from fan → flip → summary
src/
  components/            design-system primitives (AppText, Button, Card, Chip, …)
  components/art/        CardBack (original SVG), CardFace, SuitGlyph
  data/                  deck table, types, card access/search, generated image map
  engine/                random (expo-crypto), shuffle/draw, daily card, spreads, interpretation,
                         crisis detection
  config/crisis.json     crisis phrases (en + my)
  config/brand.json      app name (en + my) and store identifiers — single source of truth
  hooks/                 useLanguage, useAppFonts, useSettingsHydrated
  i18n/                  i18next instance, language helpers, typed keys
  store/                 Zustand stores (settings, font status)
  theme/                 colors, typography, spacing, ThemeContext
  utils/                 myanmar (syllable breaking), numbers, dates
locales/                 en.json, my.json, my.review.json
data/                    cards.json (generated), cards/*.json (sources), cards.review.json,
                         spreads.json (5 spreads, positions + layout, en + my)
scripts/                 check-i18n, build-cards, validate-cards, optimize-images, render-card-back
                         (+ lib/ shared with tests)
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

## Card data

```
src/data/deck.ts      structural table: 78 ids, arcana, suit, number, element, astrology (en/my),
                      Wikimedia Commons file name
data/cards/*.json     hand-written text per card, en + my: name, 3–5 keywords, upright, reversed,
                      love/career/money/health × upright/reversed, daily advice
        │  npm run build:cards  (scripts/build-cards.ts → scripts/lib/cards.ts)
        ▼
data/cards.json       generated; imported by src/data/cards.ts (CARDS, getCard, searchCards)
data/cards.review.json  Burmese native-speaker review status per card
```

`scripts/lib/cards.ts` validates every field in both languages: presence, length (English words /
Burmese syllables), keyword count, no zero-width spaces, no Zawgyi-looking text, no certainty
phrases ("guaranteed", "you will die", "သေချာပေါက်" …), unique names, canonical order. It also
checks that `cards.json` matches its sources and that every card is in the review file. The same
functions run in Jest.

Illustrations: `scripts/optimize-images.ts` turns the 1909 scans in `assets/cards/source/` (not
committed) into `assets/cards/{thumb,full}/<id>.webp` and writes `src/data/cardImages.ts`.
`CardFace` uses the image when the map has one, and otherwise draws the typographic face. The card
back is SVG generated in code (`src/components/art/cardBackSvg.ts`), rendered with `SvgXml`.

## Reading engine (`src/engine/`)

| Module | Responsibility |
| --- | --- |
| `random.ts` | `secureRandomInt` (expo-crypto bytes, rejection sampling), FNV-1a `hashString`, seeded `mulberry32` |
| `draw.ts` | Fisher–Yates `shuffle`, `prepareDeck` (orientation per card, respects the reversals setting), `drawCards` |
| `daily.ts` | `dailyCard(seed, dateKey)`: deterministic Card of the Day |
| `spreads.ts` | typed access to `data/spreads.json` + layout bounds |
| `interpret.ts` | `readingText` (topic-aware), `summarize` (rule-based, returns i18n keys) |
| `crisis.ts` | `detectCrisis`, `configuredHelpline` (from `app.config.ts` `extra`, fed by `.env`) |

Screen flow (`app/reading/[spreadId].tsx`): `setup → (crisis | shuffling) → picking → reveal`.
Animations use Reanimated: `ShuffleStack` (riffle), `FanDeck` (arc of 21 backs, picked cards lift
away), `TarotCard` (Y-axis flip), `SpreadBoard` (positions laid out from spread coordinates, the
Celtic Cross "crossing" card rotated 90°). Haptics go through `useHaptics` (respects the setting,
no-op on web), and every animation is skipped when the OS asks to reduce motion.

## Theming

`AppThemeProvider` combines the system colour scheme with `settings.themeMode`, the S/M/L font size
setting and the resolved Myanmar font. Colour tokens live in `src/theme/colors.ts`; a Jest suite
asserts WCAG AA (≥ 4.5:1) for every text/background pair in both themes. Minimum tap target is 44 dp.

## Testing & checks

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint 9 flat config), zero warnings allowed |
| `npm run validate` | locale checks + card-data validation (`check:i18n`, `check:cards`) |
| `npm run build:cards` | regenerate `data/cards.json` from `data/cards/*.json` + `src/data/deck.ts` |
| `npm run images` | resize card scans to 300/900 px WebP and regenerate `src/data/cardImages.ts` |
| `npm run render:card-back` | export the card-back art to `assets/images/card-back.{svg,png}` |
| `npm test` | Jest: utils, locale parity, contrast, card data + validator, search, full-router integration tests |
| `npm run ci` | all of the above; also run by `.github/workflows/ci.yml` |
