import type { ExpoConfig } from 'expo/config';

import brand from './src/config/brand.json';

/**
 * Store-facing identifiers can be overridden per build through environment
 * variables (see .env.example). Defaults come from src/config/brand.json,
 * the single source of truth for the app name.
 */
// `||` (not `??`) so blank lines copied from .env.example fall back to the defaults.
const env = process.env;

const config: ExpoConfig = {
  name: env.APP_DISPLAY_NAME || brand.appName.en,
  slug: env.EXPO_SLUG || brand.slug,
  scheme: brand.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: env.IOS_BUNDLE_IDENTIFIER || brand.iosBundleIdentifier,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['en', 'my'],
      // Only standard HTTPS: exempt from export-compliance documentation.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: env.ANDROID_PACKAGE || brand.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#14102B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // The app never records audio, draws over other apps or reads shared storage; keep the store
    // listing's permission list honest even if a library's manifest asks for these.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-localization',
      {
        supportedLocales: { ios: ['en', 'my'], android: ['en', 'my'] },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#14102B',
      },
    ],
    'expo-image',
    'expo-sqlite',
    ['expo-notifications', { color: '#D4AF37' }],
    // Short sound effects only: no microphone, no background audio.
    [
      'expo-audio',
      { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: '2998fd9a-2662-4b98-a316-19e5f257c2b2' },
    appName: brand.appName,
    // Shown in the crisis-support message when set. Leave empty until a verified local service is
    // chosen; the message then encourages contacting someone trusted or local emergency services.
    crisisHelpline: {
      name: env.CRISIS_HELPLINE_NAME ?? '',
      phone: env.CRISIS_HELPLINE_PHONE ?? '',
      url: env.CRISIS_HELPLINE_URL ?? '',
    },
    // Shown on the Privacy Policy / Terms / About pages. Sections that need a value are hidden
    // until it is set, so a build without them never shows a blank placeholder.
    // Optional cloud backup (Phase 6). Off unless all three are set.
    sync: {
      enabled: env.ENABLE_CLOUD_SYNC === 'true',
      url: env.SUPABASE_URL || '',
      anonKey: env.SUPABASE_ANON_KEY || '',
      // Comma-separated sign-in providers (google, apple) and whether the email-code form is shown.
      providers: env.SYNC_PROVIDERS ?? 'google',
      email: env.SYNC_EMAIL === 'true',
    },
    // Optional in-app purchases (Phase 7, RevenueCat public SDK keys). With no key for a
    // platform, that platform has no paywall and every feature is unlocked.
    purchases: {
      iosApiKey: env.REVENUECAT_IOS_API_KEY || '',
      androidApiKey: env.REVENUECAT_ANDROID_API_KEY || '',
      entitlement: env.REVENUECAT_ENTITLEMENT || 'premium',
    },
    // Optional local payment partner shown on the paywall (both must be set).
    localPayment: {
      url: env.LOCAL_PAYMENT_URL || '',
      name: env.LOCAL_PAYMENT_NAME || '',
    },
    legal: {
      publisher: env.PUBLISHER_NAME || '',
      contactEmail: env.SUPPORT_EMAIL || '',
      effectiveDate: env.LEGAL_EFFECTIVE_DATE || '',
    },
  },
};

export default config;
