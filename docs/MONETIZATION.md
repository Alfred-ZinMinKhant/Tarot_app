# Premium (RevenueCat)

Premium is optional. A build without RevenueCat keys has **no paywall and every feature
unlocked**, so you can ship a free version first.

## What is free and what is Premium

| Free forever | Premium |
| --- | --- |
| Card of the Day, one-card reading, both three-card spreads | Celtic Cross (10 cards) |
| Journal, notes, filters, data export (JSON) | Love spread (5 cards) |
| Card library, lessons, weekday signs | Unlimited reading images (free plan: 3 per calendar month) |
| Sharing up to 3 reading images per month | |

The limits live in `src/premium/features.ts` (`PREMIUM_SPREADS`, `FREE_SHARES_PER_MONTH`).
Exporting your own data is never paywalled.

## Setting it up

1. **Stores.** Create the products:
   - App Store Connect: an auto-renewable subscription group with a monthly and a yearly
     product, plus an optional non-consumable "lifetime" product. Fill in the paid-apps
     agreement and tax/banking details.
   - Google Play Console: subscriptions with monthly and yearly base plans, plus an optional
     one-time "lifetime" product. You need a payments profile.
   - Set prices per country. The stores show local prices (for example in kyat), and the app
     shows the store's own price string.
2. **RevenueCat.** Create a project and add the iOS and Android apps (with the App Store
   Connect API key and the Play service-account JSON).
   - Create the entitlement `premium`, or another name you put in `REVENUECAT_ENTITLEMENT`,
     and attach every product to it.
   - Create an offering, mark it **current**, and add packages using the standard types
     (Monthly, Annual, Lifetime). The paywall orders them Yearly → Monthly → Lifetime and
     preselects Yearly.
3. **App.** Put the public SDK keys in `.env` (`REVENUECAT_IOS_API_KEY`,
   `REVENUECAT_ANDROID_API_KEY`) and make a development or production build. In-app purchases
   don't work in Expo Go.
4. **Test.** Use App Store sandbox testers and Play licence testers. Check buying, cancelling,
   restoring on a second device, and expiry (sandbox renewals are accelerated).

## Local payment methods (Myanmar)

Many people in Myanmar don't have a card that works with the App Store or Google Play. The
paywall has an optional **Pay in Myanmar** section. It appears only when `LOCAL_PAYMENT_URL`
and `LOCAL_PAYMENT_NAME` are set (for example `KBZPay / WavePay`).

- **Pay with …** opens your URL: a shop page, a Viber/Telegram contact, or a reseller.
- **Redeem a code** opens Apple's offer-code sheet on iOS and Google Play's redeem page on
  Android. The idea is to sell App Store **offer codes** or Google Play **promo codes** for
  Premium through the local channel. The purchase stays in the store system, so RevenueCat,
  restore and the other platform features keep working.

⚠️ **Check the store rules before you turn this on.** Apple and Google limit how apps may link
to outside payment for digital content, and the rules differ by country and change often.
Selling codes outside the app can be allowed or forbidden depending on how you present it. The
section is off by default for this reason. Get advice for your target markets before you enable
it.

## Paywall requirements already handled

- Prices and periods come from the store. Renewal terms are shown, with a separate text for
  Apple and for Google.
- Restore purchases is on the paywall and in Settings → Premium.
- Terms of Use and Privacy Policy are linked from the paywall.
- Manage subscription opens the platform's subscription page.
- A purchase the user cancels shows no error. A failed purchase says nobody was charged.

# Ads (Google AdMob)

Ads are optional and **off by default**. They only run in a build with `ENABLE_ADS=true`.

## What the app shows

- **Banner:** an adaptive banner at the end of the Home, Library and Learn tabs. Never during a
  reading, in the journal, on the card of the day or on the paywall.
- **Rewarded ad:** on the paywall, when someone tapped a Premium spread, "Watch a short ad to
  unlock this reading once" opens that spread for one reading (the pass lives in memory and is
  used up when the reading screen opens). Watching less than the whole ad grants nothing.
- **Premium removes everything.** `useShowAds()` is false for subscribers.
- Ad content is capped at PG. A build with no ad unit IDs for a format shows none of it.

Code: `src/ads/` (AdMob service), `src/store/ads.ts` (state, one-off passes),
`src/components/AdBanner.tsx`, `src/config/ads.ts`.

## Turning it on

1. In AdMob, add the Android and iOS apps, then create one **Banner** and one **Rewarded** ad unit
   per platform.
2. Set in `.env` (and `eas env:create` for builds): `ENABLE_ADS=true`, `ADMOB_ANDROID_APP_ID`,
   `ADMOB_IOS_APP_ID`, `ADMOB_BANNER_ANDROID/IOS`, `ADMOB_REWARDED_ANDROID/IOS`.
   Without the app IDs the build uses Google's sample IDs: the app runs but **earns nothing**.
3. Make a development or production build (the AdMob SDK is native; it does not work in Expo Go).
   Development builds always show Google's test ads. Never tap your own live ads: that can get
   the AdMob account banned. Add your phone as an AdMob test device if you test release builds.
4. Create a consent message in AdMob → Privacy & messaging (GDPR, plus US states if you want it)
   and publish it. The app shows it through Google's UMP SDK before the first ad request, asks
   for iOS tracking permission, and exposes "Manage ad privacy" in Settings where the law requires.
5. Update the store forms: see `STORE-LISTING.md` (Contains ads, Data safety, App Privacy) and
   `docs/CONTENT-RATING.md`. The Privacy Policy already has an Ads section; run
   `npm run legal:export` and republish the hosted copy.
6. Create `app-ads.txt` on the website listed in your store listing (AdMob gives you the line),
   otherwise ad revenue is limited.

## Notes

- AdMob pays per impression and click, and is low in Myanmar-heavy traffic; expect the
  subscription and the local-payment route to matter more than ads.
- A build with ads but no RevenueCat keys has no way to remove them. Ship both together.
- The app is for adults (18+), so no child-directed treatment is applied.
