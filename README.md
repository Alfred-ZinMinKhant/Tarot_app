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
npm run validate     # locale + card-data validation (all 78 cards, both languages)
npm test             # Jest
npm run ci           # all of the above
```

## Adding or changing text

1. Add the key to **both** `locales/en.json` and `locales/my.json`.
2. Run `npm run i18n:mark-pending` to list new Burmese strings for native-speaker review.
3. `npm run check:i18n` must pass.

## Card content

- Text lives in `data/cards/*.json` (English + Burmese per card). After editing, run
  `npm run build:cards` to regenerate `data/cards.json`; `npm run validate` checks every field.
- Illustrations: `npm run images -- --download` fetches the public-domain 1909 scans from Wikimedia
  Commons and bundles 300/900 px WebP versions (needs network access to commons.wikimedia.org and
  upload.wikimedia.org). See `docs/ASSETS.md`.

See `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and `docs/glossary-my.md`.
