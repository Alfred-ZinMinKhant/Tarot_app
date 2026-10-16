# Content rating notes

These are suggested answers for the store questionnaires. They describe the app as built; check
them again if you add features. The publisher answers the questionnaires and is responsible for
the answers.

## What the app contains

- Tarot card meanings, readings, lessons and Burmese weekday signs, all presented as
  **entertainment and self-reflection** with disclaimers. There are no claims that the app
  predicts the future.
- The 1909 Rider–Waite–Smith illustrations (public domain). Some traditional images show
  mild themes such as the Death card (a skeleton on horseback), the Devil, the Tower struck by
  lightning and the Ten of Swords. None of them is graphic or realistic, and there is no gore.
  There is no nudity beyond the stylised figures of the 1909 Lovers and Star cards, which are
  line illustrations with no sexual content.
- No user-to-user communication, no user-generated content shared with others (sharing an
  image goes through the phone's own share sheet), no location, no web browsing. Ads (AdMob) appear only in a build with `ENABLE_ADS=true`; the ad content rating is capped at PG.
- A self-harm safety feature. Questions that mention self-harm or suicide get a supportive
  message instead of a reading, and a helpline when one is configured.
- Optional in-app purchases (Premium).

## Apple App Store (age rating questionnaire)

| Question | Answer |
| --- | --- |
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Prolonged graphic or sadistic realistic violence | None |
| Profanity or crude humour | None |
| Mature / suggestive themes | None (the traditional card art is not suggestive) |
| Horror / fear themes | None, or at most *Infrequent/Mild* if a reviewer counts the Death and Devil cards. Answering *Infrequent/Mild* still gives 9+ at worst |
| Medical / treatment information | None. Health readings are framed as wellbeing reflection with a "not medical advice" disclaimer |
| Alcohol, tobacco, drug use or references | None |
| Simulated gambling | None |
| Sexual content or nudity | None |
| Contests | None |
| Unrestricted web access | No |
| User-generated content | No |
| Messaging and chat | No |
| Age assurance / parental controls | Not applicable |

**Expected result: 4+** (9+ if Horror/Fear is answered *Infrequent/Mild*).

## Google Play (IARC questionnaire)

- Category: *Reference, News, or Educational*. If you consider readings the app's main use,
  choose *All Other App Types*. Both lead to the same questions for this app.
- Violence, fear, sexuality, language, controlled substances, crude humour: **No**.
- Gambling: **No.** Tarot readings involve no wagering, money or prizes.
- Users can interact or exchange content: **No.**
- Shares the user's location: **No.**
- Allows purchase of digital goods: **Yes** if Premium is enabled.
- Expected: **Everyone / PEGI 3 / USK 0** (IARC may add "In-App Purchases").

## Google Play — other declarations

- **Target audience:** 18+ (adults). The app is not designed for children. Choosing 18+ also
  keeps it outside the Families policy requirements.
- **News app:** No. **Government app:** No. **Health app:** No (it is not a health or medical app).
- **Ads:** Yes in an ads build (`ENABLE_ADS=true`), otherwise No. Not a child-directed app.
- **Data safety:** see `STORE-LISTING.md` → Privacy answers.
- **Account deletion URL** (needed only when cloud backup is enabled): link to a page explaining
  *Settings → Cloud backup → Delete cloud account* and your support email.

## Sensitive topics: how the app handles them

- No certainties about death, illness, pregnancy, legal outcomes or money. The card-data
  validator (`npm run check:cards`) rejects certainty wording such as "you will die",
  "guaranteed" and "definitely will", in English and in Burmese.
- No medical or financial advice. Weekday signs avoid health and money wording entirely, and
  `npm run check:content` enforces this.
- No Buddhist sacred imagery (no pagodas or Buddha images) and no mixing of tarot with
  religious practice.
- Crisis phrases (`src/config/crisis.json`) switch the reading to a caring message. Helpline
  details are shown only when configured with a verified service.
