# Decisions log

Ambiguous choices made while building, with the simplest option chosen. Change any of these freely.

## Phase 1

1. **Expo SDK 57 / RN 0.86 / React 19.2 / TypeScript 6.** Latest stable at the time of writing.
2. **Routes at `app/` (repo root)** as specified in the brief, not `src/app/` (expo-router supports both).
3. **Fonts are loaded at runtime with `Font.loadAsync`, not embedded via the expo-font config plugin.**
   Embedded fonts get platform-specific family names (file name on Android, PostScript name on iOS);
   runtime loading gives identical names on both and still works fully offline because the TTFs are
   bundled assets. Cost: ~10–30 ms at startup behind the splash screen.
4. **English uses the platform system font.** Both bundled Myanmar fonts include Latin glyphs, but the
   system font looks more native for English. Any string containing Burmese characters switches to
   the Myanmar font automatically.
5. **"Fallback" font = automatic + user choice.** RN has no per-glyph font fallback chain, so Padauk is
   used automatically if Noto fails to load, and Settings offers a "Burmese font" switch (some readers
   prefer Padauk's shapes).
6. **Line-height 1.8× for Burmese, 1.4× for Latin.** 1.6 (the brief's minimum) was visibly tight with
   Noto's tall stacked marks; 1.8 renders without clipping at 360 dp (see `docs/screenshots/phase1`).
7. **Syllable breaking happens at render time** (`AppText` → `breakBurmese`) instead of storing U+200B
   in locale files. The locale checker rejects ZWSP in `my.json` so stored text stays clean and
   searchable.
8. **App name lives in `src/config/brand.json`** (read by both `app.config.ts` and the i18n bundle).
   Store identifiers can be overridden from `.env` (see `.env.example`).
9. **"Tarot" stays in English in Burmese text** (owner decision). Burmese strings write the Latin word
   "Tarot" (e.g. "Tarot ကတ်") instead of a transliteration, and the app name is "Nat Tarot" in both
   languages (`src/config/brand.json`).
10. **Language "follow device" is the default** (`settings.language = null`). Picking a language on
    onboarding or in Settings pins it.
11. **Intl-free number/date formatting.** Hermes builds don't reliably include Burmese locale data,
    so month/weekday names and digit conversion are implemented directly.
12. **Icons are a small original SVG set** (`src/components/Icon.tsx`) instead of an icon-font package,
    keeping the bundle small and avoiding a network-installed font.
13. **React Native Testing Library is pinned to v13**, the version `expo-router/testing-library`
    supports (v14 made `render` async and breaks `renderRouter`).
14. **`react-native-web` is installed** only so the app can be exported to web and screenshotted in CI
    / cloud sandboxes without an emulator. Web is not a shipping target.
15. **Tab labels don't scale with system font size** (they sit in a fixed-height bar and would clip);
    every other text scales up to 2×.

## Phase 2 — card data, library

16. **Card data is a bundled JSON file, not SQLite.** `data/cards.json` is read-only reference
    content shipped inside the app bundle, so it already works offline and needs no migrations.
    SQLite is used for user data (journal, Phase 4).
17. **Card text is authored in batches** (`data/cards/01-major-a.json` … `12-pentacles-b.json`) and
    merged with the structural table in `src/data/deck.ts` by `npm run build:cards`.
    `npm run check:cards` (part of `npm run validate`) fails if `cards.json` is out of date.
18. **Burmese length limits are measured in syllables.** Burmese doesn't put spaces between words,
    so "60–90 words" can't be counted directly. The limits are 100–200 syllables for upright and
    reversed meanings, 40–90 for area readings and 10–60 for the daily advice. The ratio is about
    1.8 Burmese syllables per English word, measured on the first batch.
19. **Astrological associations follow the Golden Dawn attributions** (planets/signs for the Major
    Arcana, decans for pips 2–10, "Root of …" for Aces). Court cards use a common modern
    element-of-element scheme: Page = Earth, Knight = Air, Queen = Water, King = Fire.
20. **Burmese card names.** Pips are counted the natural way: "တုတ် နှစ်ချောင်း", "ခွက် နှစ်လုံး",
    "ဓား နှစ်လက်", "ဒင်္ဂါး နှစ်ပြား". Court titles follow the glossary. Two Major Arcana names avoid
    religious terms: The Devil is "မကောင်းဆိုးဝါး" (not မာရ်နတ်, a Buddhist concept), and the
    Hierophant and High Priestess use ပုရောဟိတ် (court priest) titles. The words "samsara" (သံသရာ)
    and "dhamma" (ဓမ္မ) are avoided in card text.
21. **Card back motifs**: lotus, kanok scrolls, crescent moon and stars. Pagodas are left out because
    they are sacred buildings. The brief listed them as an option, but it also asks not to mix tarot
    with Buddhist imagery, so the stricter reading wins.
22. **Typographic card faces until the scans are available.** The cloud sandbox used to build
    Phase 2 could not reach `upload.wikimedia.org` or `commons.wikimedia.org`. The image pipeline
    (`npm run images -- --download`) is ready. Until it runs, each card shows an original ivory face
    with its number, a suit glyph and its name. No other artwork is substituted.
23. **The Burmese review list for cards is per card** (`data/cards.review.json`), not per string. A
    reviewer approves a whole card at a time.
24. **Search** matches every typed word against names, keywords and suit labels in both languages,
    ignoring case and zero-width spaces. It combines with the suit filter (AND).
25. **The library count avoids plural forms** ("Showing 14 of 78"). Burmese has no plural
    categories, and i18next plural keys would break the identical-keys rule between the two files.

## Phase 3 — reading engine and reading UI

26. **Orientation is decided when the deck is shuffled.** `prepareDeck` shuffles all 78 cards
    (Fisher–Yates with `expo-crypto` bytes and rejection sampling, so no modulo bias) and flips a
    secure coin for each card. The user then picks from that deck, so a spread can never repeat a
    card.
27. **The fan shows the top 21 cards of the shuffled deck.** All 78 overlapping cards would be too
    thin to tap at 360 dp. Because the deck was shuffled securely, picking from the top 21 is just
    as random. "Choose for me" helps anyone who finds the fan hard to tap (screen reader users,
    large text, motor difficulties).
28. **The daily card is deterministic per device and date.** It uses a FNV-1a hash of
    `deviceSeed|YYYY-MM-DD` feeding mulberry32. The seed is a random UUID created on first use and
    stored only in settings. Turning reversals off keeps the same card but shows it upright.
29. **Topic readings.** Love, Career, Money and Health use each card's area reading. General and
    "Ask a question" use the main upright or reversed meaning.
30. **The summary is rule-based, not generated.** It notes "many/no Major Arcana", a dominant suit,
    "many reversed" or "all upright", then lists the key themes and gives the advice of the last
    position. Every sentence is a reviewed locale string, so nothing unvetted reaches the user.
31. **Crisis detection** uses a phrase list in `src/config/crisis.json` (en + my). Matching ignores
    case and zero-width spaces, and ignores spaces inside Burmese phrases. The reading is replaced
    by a caring message. Helpline details come only from `.env` (`CRISIS_HELPLINE_*`). With no
    helpline configured, the message points to trusted people and local emergency numbers without
    printing any number.
32. **Reduced motion** comes from `AccessibilityInfo` (`useReduceMotion`), which skips the shuffle and
    flip animations. Reanimated's own hook isn't in its Jest mock. Jest uses
    `react-native-worklets/jest/resolver.js` so Reanimated runs under test.
33. **i18n placeholders never use `{{count}}`.** i18next treats `count` as a plural selector, and the
    app passes numbers pre-formatted (possibly in Burmese digits). `check:i18n` enforces this.

## Phase 4 — journal, daily card, sharing, reminders

34. **Readings are saved automatically** once every card is turned over, then a toast offers to open
    the saved entry. The brief says every reading is saved, and saving automatically means a
    reading can't be lost by forgetting a button.
35. **SQLite schema** (`src/db/schema.ts`): `readings` holds the spread, topic, question, notes and
    `cards` (JSON `[{positionId, cardId, reversed}]`); `daily_draws` holds one row per date.
    Migrations are tracked in `PRAGMA user_version`. Only card ids are stored, so saved readings
    always show the current (reviewed) card text in the active language.
36. **Deleting a reading clears its question and notes and marks it with `deleted_at`.** The empty
    row lets Phase 6 sync propagate the delete (last write wins). "Delete my data" (Phase 5)
    removes rows completely.
37. **Card of the Day is drawn once per day.** The first reveal is written to `daily_draws`
    (`INSERT OR IGNORE`). Later opens show the same card even if the reversals setting changes
    during the day.
38. **Tests run the real SQL** through `sql.js` (pure JavaScript SQLite), which stands in for
    `expo-sqlite` in `jest.setup.ts`. The web preview uses an in-memory repository
    (`src/db/index.web.ts`), because expo-sqlite on web needs extra worker/WASM headers and web
    is not a target.
39. **Reminders are seven dated notifications, not one repeating trigger.** Each day gets its own
    text in the active language. The teaser names the element of that day's card ("Fire
    energy…") without naming the card. The queue is rebuilt on app start and whenever the
    language, time or toggle changes, so it always runs a week ahead. Tapping a reminder opens
    `/daily`. Time is set in 15-minute steps with two large buttons, which avoids adding a
    native date-picker dependency.
40. **Sharing shows a preview first.** A bottom sheet displays the image (app name, reading title,
    date, question, cards, positions and the disclaimer). `react-native-view-shot` captures that
    visible view and `expo-sharing` opens the system share sheet. On web, or where sharing isn't
    available, a toast explains it.
41. **UUIDs come from `expo-crypto` random bytes** (`src/utils/id.ts`), because `randomUUID` is not
    implemented in the Jest environment.

