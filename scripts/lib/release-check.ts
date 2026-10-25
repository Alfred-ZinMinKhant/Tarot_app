export type Env = Record<string, string | undefined>;
export type ReleaseReport = { errors: string[]; warnings: string[]; notes: string[] };

/** Google's public sample AdMob IDs (all start with this publisher): they earn nothing. */
const GOOGLE_SAMPLE_PUBLISHER = 'ca-app-pub-3940256099942544';
const APP_ID = /^ca-app-pub-\d{16}~\d+$/;
const UNIT_ID = /^ca-app-pub-\d{16}\/\d+$/;

const set = (v: string | undefined): v is string => !!v && v.trim() !== '';

/**
 * Checks the store-facing environment of a release build (the values in .env or in the EAS
 * environment). Errors mean the build would be wrong or earn nothing; warnings are worth a look.
 */
export function checkRelease(env: Env): ReleaseReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  for (const key of ['PUBLISHER_NAME', 'SUPPORT_EMAIL']) {
    if (!set(env[key])) errors.push(`${key} is empty: the legal pages would have no publisher or contact.`);
  }
  if (!set(env.LEGAL_EFFECTIVE_DATE)) warnings.push('LEGAL_EFFECTIVE_DATE is empty: the legal pages show no date.');

  const adsOn = env.ENABLE_ADS === 'true';
  const androidKey = env.REVENUECAT_ANDROID_API_KEY;
  const iosKey = env.REVENUECAT_IOS_API_KEY;

  if (adsOn) {
    const appIds: [string, string | undefined, boolean][] = [
      ['ADMOB_ANDROID_APP_ID', env.ADMOB_ANDROID_APP_ID, true],
      ['ADMOB_IOS_APP_ID', env.ADMOB_IOS_APP_ID, false],
    ];
    for (const [name, value, required] of appIds) {
      if (!set(value)) {
        (required ? errors : warnings).push(`${name} is empty: the build would use Google's sample ID and earn nothing.`);
      } else if (!APP_ID.test(value) || value.startsWith(GOOGLE_SAMPLE_PUBLISHER)) {
        errors.push(`${name} is not a real AdMob app ID (ca-app-pub-<16 digits>~<digits>).`);
      }
    }
    const units: [string, string | undefined, boolean][] = [
      ['ADMOB_BANNER_ANDROID', env.ADMOB_BANNER_ANDROID, true],
      ['ADMOB_REWARDED_ANDROID', env.ADMOB_REWARDED_ANDROID, true],
      ['ADMOB_INTERSTITIAL_ANDROID', env.ADMOB_INTERSTITIAL_ANDROID, true],
      ['ADMOB_BANNER_IOS', env.ADMOB_BANNER_IOS, false],
      ['ADMOB_REWARDED_IOS', env.ADMOB_REWARDED_IOS, false],
      ['ADMOB_INTERSTITIAL_IOS', env.ADMOB_INTERSTITIAL_IOS, false],
    ];
    for (const [name, value, required] of units) {
      if (!set(value)) {
        (required ? errors : warnings).push(`${name} is empty: that ad format won't show.`);
      } else if (!UNIT_ID.test(value) || value.startsWith(GOOGLE_SAMPLE_PUBLISHER)) {
        errors.push(`${name} is not a real AdMob ad unit ID (ca-app-pub-<16 digits>/<digits>).`);
      }
    }
    if (!set(androidKey) && !set(iosKey)) {
      notes.push(
        'Ads without RevenueCat keys: Love and Celtic Cross sit behind a rewarded ad, and nobody can remove ads until Premium ships.',
      );
    }
    if (set(env.ADMOB_TEST_DEVICES)) {
      warnings.push('ADMOB_TEST_DEVICES is set: fine for your phone, but remove it from the production environment.');
    }
  } else {
    const adVars = Object.keys(env).filter((k) => k.startsWith('ADMOB_') && k !== 'ADMOB_TEST_DEVICES' && set(env[k]));
    if (adVars.length) warnings.push(`ENABLE_ADS is not "true" but ${adVars.join(', ')} are set: this build shows no ads.`);
  }

  if (set(androidKey) && !androidKey.startsWith('goog_')) {
    errors.push('REVENUECAT_ANDROID_API_KEY should be the public Google key (starts with goog_), never a secret key.');
  }
  if (set(iosKey) && !iosKey.startsWith('appl_')) {
    errors.push('REVENUECAT_IOS_API_KEY should be the public Apple key (starts with appl_), never a secret key.');
  }
  if ((set(androidKey) || set(iosKey)) && !set(env.REVENUECAT_ENTITLEMENT)) {
    notes.push('REVENUECAT_ENTITLEMENT is empty: the app falls back to "premium".');
  }
  if (adsOn === false && !set(androidKey) && !set(iosKey)) {
    notes.push('No ads and no RevenueCat keys: a fully free build with everything unlocked.');
  }
  if (set(env.LOCAL_PAYMENT_URL) !== set(env.LOCAL_PAYMENT_NAME)) {
    warnings.push('Set both LOCAL_PAYMENT_URL and LOCAL_PAYMENT_NAME, or neither: the Myanmar payment section needs both.');
  }

  return { errors, warnings, notes };
}
