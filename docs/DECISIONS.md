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

