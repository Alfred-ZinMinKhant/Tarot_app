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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appName: brand.appName,
    // Shown in the crisis-support message when set. Leave empty until a verified local service is
    // chosen; the message then encourages contacting someone trusted or local emergency services.
    crisisHelpline: {
      name: env.CRISIS_HELPLINE_NAME ?? '',
      phone: env.CRISIS_HELPLINE_PHONE ?? '',
      url: env.CRISIS_HELPLINE_URL ?? '',
    },
  },
};

export default config;
