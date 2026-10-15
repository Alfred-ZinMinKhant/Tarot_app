# Nat Tarot

A bilingual (English + Burmese) offline-first tarot app for Android and iOS, built with Expo.

## Quick start

```bash
npm install
npm start            # then press a (Android) or i (iOS), or scan the QR code
```

Expo Go works for Phase 1. Later phases add native modules (SQLite, notifications), after which use a
development build: `npx expo run:android` / `npx expo run:ios`, or `eas build --profile development`.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint, zero warnings
npm run validate     # locale (and later card-data) validation
npm test             # Jest
npm run ci           # all of the above
```

## Adding or changing text

1. Add the key to **both** `locales/en.json` and `locales/my.json`.
2. Run `npm run i18n:mark-pending` to list new Burmese strings for native-speaker review.
3. `npm run check:i18n` must pass.

See `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and `docs/glossary-my.md`.
