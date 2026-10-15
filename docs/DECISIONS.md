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
