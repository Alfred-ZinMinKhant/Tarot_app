# Manual QA checklist

Run this on a **real Android phone and a real iPhone** (development or preview build) before each
store release. Automated coverage is listed per item so you know what is already protected:
**J** = Jest integration/unit test, **M** = Maestro flow, **W** = checked in the web preview
(screenshots in `docs/screenshots/`). Items marked **Device only** can't be verified in this
repository's CI and need a person with a phone.

Status key: ✅ automated and passing · 🔶 partly automated, needs a device check · 📱 device only.

## 1. First run & onboarding

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 1.1 | Fresh install opens on Welcome, in the device language (English or Burmese) | J (app-shell), M | 🔶 device locale detection needs a real device |
| 1.2 | Switching language on Welcome changes every string instantly | J, M | ✅ |
| 1.3 | Welcome shows the full entertainment / no-prediction disclaimer | J (phase5) | ✅ |
| 1.4 | Steps show "Step 1 of 3" etc. to TalkBack / VoiceOver, in Burmese numerals when enabled | J | 🔶 listen with a screen reader |
| 1.5 | Step 3: name, weekday sign (incl. Wednesday-afternoon → Rahu), reminder opt-in | J, M | 🔶 permission prompt is device only |
| 1.6 | Skip on any step lands on Home and saves nothing from step 3 | J | ✅ |

## 2. Burmese text

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 2.1 | No clipped stacked vowels/medials (ျ ြ ွ ှ, ု ူ) in titles, buttons, chips, toasts | W | 📱 check on Android **and** iOS at S/M/L text size |
| 2.2 | Long Burmese lines wrap at syllable boundaries, never mid-syllable | J (myanmar), W | 🔶 |
| 2.3 | Padauk font option visibly switches the Burmese font | — | 📱 |
| 2.4 | Typing Burmese (Myanmar3/Unicode keyboard, Gboard Burmese) in question, notes and name fields: no autocorrect damage, text renders in the Myanmar font | — | 📱 |
| 2.5 | Text from a Zawgyi keyboard is not supported; confirm it doesn't crash the app | — | 📱 |
| 2.6 | Burmese numerals setting changes dates, times, counts, step labels | J | ✅ |
| 2.7 | Dates read naturally in Burmese (weekday, day, month, year order) | J (dates) | 🔶 native-speaker read-through |
| 2.8 | Native speaker has reviewed `locales/my.review.json`, `data/cards.review.json`, `data/content.review.json` | — | 📱 **pending — all Burmese text is AI-written** |

## 3. Readings

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 3.1 | All five spreads: shuffle, pick from fan, flip, summary | J (reading), M (3-card) | 🔶 feel of animations on a mid-range Android |
| 3.2 | Never the same card twice in one reading; reversals follow the setting | J (engine) | ✅ |
| 3.3 | Celtic Cross layout readable on a small phone (360 dp) and doesn't overlap | W | 🔶 |
| 3.4 | Crisis phrases (en + my) show the caring message instead of a reading | J | ✅ |
| 3.5 | Helpline line appears only when `CRISIS_HELPLINE_*` are set; Call / website open | J | 🔶 tap-to-call is device only |
| 3.6 | Disclaimer visible under every reading and daily card | J | ✅ |
| 3.7 | Reduce Motion (system setting) skips long animations | J (hook) | 📱 |
| 3.8 | Haptics on card pick / flip; off when disabled | — | 📱 |
| 3.9 | Sound effects off by default; when on, soft shuffle / flip / chime; silent with the iOS silent switch | J (toggle, play count) | 📱 audio output |

## 4. Card of the Day & reminders

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 4.1 | Same card all day, including after force-quit | J, M | ✅ |
| 4.2 | New card after midnight (local time) | J (daily) | 🔶 |
| 4.3 | Reminder arrives at the chosen time with an element teaser, in the current language | J (plan) | 📱 |
| 4.4 | Tapping the reminder opens Card of the Day | J (mock) | 📱 |
| 4.5 | Turning reminders off cancels all queued notifications | J | 🔶 |
| 4.6 | Android 13+: permission prompt; denied → friendly toast, switch stays off | — | 📱 |

## 5. Journal & sharing

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 5.1 | Finished readings appear in the journal; survive restart | J, M | ✅ |
| 5.2 | Topic and date filters | J | ✅ |
| 5.3 | Notes edit and save (Burmese too) | J, M | 🔶 Burmese keyboard is device only |
| 5.4 | Share as image: preview, system sheet, image looks right in Messenger / Viber / Photos | J (mocked) | 📱 |
| 5.5 | Delete one reading | J | ✅ |

## 6. Library, Learn, weekday signs

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 6.1 | Library scrolls smoothly through 78 cards; suit filters; search in English and Burmese | J | 🔶 scroll performance on a low-end Android |
| 6.2 | Card images show once `npm run images -- --download` has been run | — | 📱 **pending — images not yet downloaded (see docs/ASSETS.md)** |
| 6.3 | Learn: eight lessons, progress bar, finishing opens the next lesson | J | ✅ |
| 6.4 | Weekday sign: chooser, birth-date finder (Burmese digits too), explore all eight, Home mood line | J, M | ✅ |
| 6.5 | Sign texts are framed as entertainment; no health or money predictions | `check:content` | ✅ |

## 7. Settings & data

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 7.1 | Theme system / light / dark; text size S / M / L applies everywhere | J (contrast), W | 🔶 |
| 7.2 | Export my data: share sheet offers Files / Drive / email; JSON opens and contains readings | J (mocked) | 📱 |
| 7.3 | Delete my data: confirm sheet, everything gone, back to onboarding, reminders cancelled | J | ✅ |
| 7.4 | Privacy Policy and Terms open in both languages; contact / publisher appear once set in `.env` | J | ✅ |
| 7.5 | About shows version, art credit, disclaimer | J | ✅ |

## 8. Accessibility

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 8.1 | TalkBack and VoiceOver read every button, card and chip in the current language | J (labels) | 📱 |
| 8.2 | Face-down cards are announced as "Face-down card N"; revealed cards by name | J | 🔶 |
| 8.3 | All tap targets ≥ 44 dp | code review | 🔶 |
| 8.4 | Contrast meets WCAG AA in light and dark themes | J (contrast) | ✅ |
| 8.5 | Large system font (Android "Largest", iOS Larger Text) doesn't break layouts | — | 📱 |

## 9. Release build

| # | Check | Coverage | Status |
| --- | --- | --- | --- |
| 9.1 | `npm run ci` passes | CI | ✅ |
| 9.2 | Android & iOS JS bundles export (`npx expo export`) | CI-equivalent run | ✅ |
| 9.3 | Production build installs and opens offline (airplane mode) | — | 📱 |
| 9.4 | App name, icon and splash correct on both platforms | — | 📱 |
| 9.5 | Maestro flows pass on an Android emulator and an iOS simulator | M | 📱 not run in this environment (no emulator) |
