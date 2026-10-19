import Constants from 'expo-constants';
import { Platform } from 'react-native';

import brand from './brand.json';

export type StoreLinks = { listing: string; review: string };

/**
 * Where this build is listed in its store, for "Share app" and "Rate app". Android needs nothing
 * extra; iOS needs the numeric App Store ID (.env → app.config.ts → extra.store.iosAppId), so
 * without it iOS builds return null and the buttons stay hidden.
 */
export function storeLinks(): StoreLinks | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { store?: { iosAppId?: string } };
  if (Platform.OS === 'android') {
    const id = Constants.expoConfig?.android?.package ?? brand.androidPackage;
    return {
      listing: `https://play.google.com/store/apps/details?id=${id}`,
      review: `market://details?id=${id}`,
    };
  }
  const appId = extra.store?.iosAppId?.trim();
  if (Platform.OS === 'ios' && appId) {
    const listing = `https://apps.apple.com/app/id${appId}`;
    return { listing, review: `${listing}?action=write-review` };
  }
  return null;
}
