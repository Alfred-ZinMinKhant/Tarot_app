# Architecture

_Last updated: Phase 4 (journal in SQLite, Card of the Day, sharing, reminders)._

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
  (onboarding)/          welcome (+ disclaimer), language, about-you (name, weekday sign, reminder)
  (tabs)/                home, library (FlashList grid + filters + search), journal, learn, settings
  card/[id].tsx          card detail: all meanings, upright/reversed toggle
  reading/[spreadId].tsx reading flow: topic + question → shuffle → pick from fan → flip → summary
  daily.tsx              Card of the Day: reveal once, meaning, save to journal, share
  journal/[id].tsx       saved reading: cards + meanings, notes, share, delete
  sign.tsx               Burmese weekday sign: details, daily mood, chooser, explore all eight
  learn/[id].tsx         one lesson; finishing marks it read and opens the next
  about.tsx              about, disclaimer, art credit, publisher/contact (from .env)
  legal/[doc].tsx        privacy policy / terms (data/legal.json, variables from .env)
  paywall.tsx            Premium paywall (modal): benefits, store packages, restore, local payment
src/
  components/            design-system primitives (AppText, Button, Card, Chip, …)
  components/art/        CardBack (original SVG), CardFace, SuitGlyph
  data/                  deck table, types, card access/search, generated image map;
                         content.ts (weekday signs, lessons, legal texts)
  engine/                random (expo-crypto), shuffle/draw, daily card, spreads, interpretation,
                         crisis detection
  config/crisis.json     crisis phrases (en + my)
  db/                    SQLite: schema + migrations, journal repository, sql.js adapter (tests),
                         in-memory repo for the web preview (index.web.ts)
  premium/               features.ts (what's Premium), service.ts (interface), revenuecat.ts
                         (+ .web.ts no-op)
  sync/                  engine.ts (pull → merge → push, last write wins), supabase.ts (client,
                         backend, email-code auth)
  services/              notifications (plan + schedule reminders), share (view-shot → sharing),
                         sound (expo-audio effects), userData (export/delete), exportFile
  config/brand.json      app name (en + my) and store identifiers — single source of truth
  config/legal.ts        publisher / contact / effective date from app config (.env)
  hooks/                 useLanguage, useAppFonts, useSettingsHydrated
  i18n/                  i18next instance, language helpers, typed keys
  store/                 Zustand stores: settings (persisted), journal, daily, toast, font status
  theme/                 colors, typography, spacing, ThemeContext
  utils/                 myanmar (syllable breaking), numbers, dates
locales/                 en.json, my.json, my.review.json
data/                    cards.json (generated), cards/*.json (sources), cards.review.json,
                         spreads.json (5 spreads, positions + layout, en + my), lessons.json (8),
                         weekday-signs.json (8 signs incl. Rahu), legal.json, content.review.json
assets/sounds/           flip / shuffle / chime WAVs synthesised by scripts/render-sounds.ts
store/                   store graphics, screenshots (en + my), hostable legal pages
supabase/                SQL migration (table, RLS, LWW trigger), delete-account Edge Function, setup
.maestro/                end-to-end flows: onboarding, daily card, reading → journal
scripts/                 check-i18n, build-cards, validate-cards, validate-content, optimize-images,
                         render-card-back, render-sounds, render-icons, store-screenshots,
                         export-legal
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

## Journal & daily card

`src/db` owns persistence. `getJournalRepo()` opens `nattarot.db` once (WAL), runs migrations and
returns a `JournalRepo`: save, list (topic/kind/date filters), get, update notes, soft-delete,
delete all, and the daily-draw records. `useJournal` (Zustand) is an in-memory mirror that the
screens read. It is loaded on startup in `AppServices` (root layout) and updated after each
write. `useDaily` computes the Card of the Day with `dailyCard(deviceSeed, date)` and persists the
first reveal.

## Notifications

`planReminders` (pure, tested) produces seven `{date, title, body}` entries at the chosen local
time. The body is an element teaser for that date's card. `scheduleReminders` replaces queued
notifications with ids `daily-reminder-YYYY-MM-DD`, using DATE triggers on the `daily-reminder`
Android channel. `useReminders` (root layout) re-plans whenever the toggle, time or language
changes, and opens `/daily` when a reminder is tapped. Web gets no-op modules
(`*.web.ts`).

## Weekday signs, Learn and personal data

`src/data/content.ts` loads `data/weekday-signs.json` and `data/lessons.json`. `signForWeekday` and
`signForBirthDate` map a birth weekday or date to one of the eight signs. Wednesday is split at
noon: from noon onwards the sign is Rahu. `dailyMood` hashes the sign and date to pick one of five
light-hearted lines, so the line stays the same all day. Settings holds `name`, `birthSign`,
`lessonsRead` and `soundEnabled`, persisted with the rest. `services/userData.ts` builds the JSON
export (everything except the device seed) and runs *Delete my data*: it cancels reminders, hard-
deletes every row in SQLite and wipes settings (including the seed), then sends the user back to
onboarding. Sounds are played through `useHaptics()`, which handles both vibration and audio for
card actions.

## Cloud backup (optional, Phase 6)

Off unless the build sets `ENABLE_CLOUD_SYNC=true`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`
(`src/config/sync.ts`). In that case the root layout wires `useSync` to Supabase. Otherwise
`syncAvailable()` is false, the Settings card is hidden and no network code runs.

- **Data:** only journal readings, tombstones included. Settings, daily draws and the device seed
  stay local. SQLite migration 2 adds `readings.dirty`. Every local write sets it, and it is
  cleared only when the uploaded `updatedAt` still matches.
- **Round** (`syncJournal`): pull the server's change feed (ordered by
  `(server_updated_at, id)`, re-reading a 2-minute window to cover slow commits) and merge with
  `applyRemote`, where a later `updatedAt` wins and ties keep the local copy. Then upload dirty
  rows. The server trigger `journal_readings_lww` ignores uploads that aren't newer, so neither
  side can lose a newer edit, in any order.
- **Triggers** (`useCloudSync`): app launch, return to foreground, and 4 s after the last local
  journal change (`useJournal.localChanges`). Failures leave rows dirty for the next attempt.
- **Auth:** email one-time code (`signInWithOtp` / `verifyOtp`), with the session in AsyncStorage.
  Signing in or out marks every row dirty, so a new account receives the whole journal. *Delete
  cloud account* calls the `delete-account` Edge Function, which deletes the auth user, and
  the rows cascade. *Delete my data* signs out first, so the local wipe doesn't propagate.
- **Tests** use `test/mocks/fakeCloud.ts`, which reproduces the table and trigger in memory, with
  two simulated devices on separate sql.js databases.

## Premium (optional, Phase 7)

`usePremium` (Zustand, persisted) caches the entitlement, so Premium stays unlocked offline,
along with the free-plan share counter (`shareMonth`, `sharesUsed`). The root layout wires a
`PurchasesService`. That is RevenueCat when `purchasesConfig()` finds a key for the platform;
otherwise it is `null`, and `useUnlocked()` is then always true. Gates:

- **Home** marks Love and Celtic Cross with a Premium badge, and tapping either opens
  `/paywall?reason=spread:<id>`.
- **`reading/[spreadId]`** shows a locked state for direct links.
- **`ShareSheet`** counts free image shares per calendar month and sends the user to the
  paywall when they run out.

`revenueCatService` maps RevenueCat offerings to `PremiumPackage` (with the store-localised
price string), maps purchase errors to `cancelled` / `failed`, and listens for entitlement
changes. Tests use `test/mocks/fakePurchases.ts`. See `docs/MONETIZATION.md` for store setup.

## Theming

`AppThemeProvider` combines the system colour scheme with `settings.themeMode`, the S/M/L font size
setting and the resolved Myanmar font. Colour tokens live in `src/theme/colors.ts`; a Jest suite
asserts WCAG AA (≥ 4.5:1) for every text/background pair in both themes. Minimum tap target is 44 dp.

## Testing & checks

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint 9 flat config), zero warnings allowed |
| `npm run validate` | locale checks + card-data + content validation (`check:i18n`, `check:cards`, `check:content`) |
| `npm run render:icons` | regenerate the app icon set and Play graphics |
| `npm run store:screenshots` | capture store screenshots from `dist/` (web export) in en + my |
| `npm run legal:export` | write `store/legal/` privacy + terms (md, html) with `.env` values |
| `npm run render:sounds` | regenerate the original sound effects in `assets/sounds/` |
| `npm run build:cards` | regenerate `data/cards.json` from `data/cards/*.json` + `src/data/deck.ts` |
| `npm run images` | resize card scans to 300/900 px WebP and regenerate `src/data/cardImages.ts` |
| `npm run render:card-back` | export the card-back art to `assets/images/card-back.{svg,png}` |
| `npm test` | Jest: utils, locale parity, contrast, card data + validator, search, engine, SQLite repo (sql.js), notifications (in-memory fake), full-router integration tests (onboarding, signs, Learn, export/delete, legal) |
| (sync) | `__tests__/sync.test.ts` two-device LWW scenarios, `cloud-sync.test.tsx` UI + store, `supabase-backend.test.ts` query building |
| (premium) | `__tests__/premium.test.tsx`: gating, purchase, cancel, restore, offline prices, share allowance, local payment |
| `maestro test .maestro` | end-to-end flows on a device or emulator (dev/preview build) |
| `npm run ci` | all of the above; also run by `.github/workflows/ci.yml` |
