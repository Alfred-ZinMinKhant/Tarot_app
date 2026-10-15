# Mingalar Tarot

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
npm run validate     # locale, card-data and content validation (both languages)
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

## Configuration

Copy `.env.example` to `.env` and fill in what you need. Everything is optional for local
development. After changing `.env`, restart Metro with `npx expo start --clear` (or export with
`--clear`), because cached bundles keep the old values. Optional cloud backup is described in
`supabase/README.md`, and optional Premium in `docs/MONETIZATION.md`.

## Building for the stores

```bash
npm install -g eas-cli && eas login
eas init                                   # links the project (writes the EAS project id)
eas env:create --environment production    # once per secret from .env (SUPABASE_*, REVENUECAT_*, …)
eas build --profile development --platform android   # dev client for testing native features
eas build --profile production --platform all        # store builds (AAB + IPA)
eas submit --profile production --platform all       # upload to Play (internal track, draft) and App Store Connect
```

Store text, privacy answers and graphics: `STORE-LISTING.md`, `docs/CONTENT-RATING.md`, `store/`.
Regenerate assets with `npm run render:icons`, `npm run store:screenshots` (after a web export)
and `npm run legal:export`.

## End-to-end tests

Install [Maestro](https://maestro.mobile.dev), start a development or preview build on an emulator,
then run `maestro test .maestro`. Manual release checks are in `docs/QA.md`.

See `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and `docs/glossary-my.md`.
