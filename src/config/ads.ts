import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AdsConfig = {
  /** Banner ad unit for this platform, or null when none is configured. */
  banner: string | null;
  /** Rewarded ad unit ("watch an ad to unlock one reading"), or null. */
  rewarded: string | null;
};

type Extra = {
  ads?: {
    enabled?: boolean;
    bannerIos?: string;
    bannerAndroid?: string;
    rewardedIos?: string;
    rewardedAndroid?: string;
  };
};

/**
 * Ads (Google AdMob) are optional and off unless the build sets ENABLE_ADS=true
 * (.env → app.config.ts → extra.ads). Development builds always use Google's test ads; release
 * builds show a format only when its ad unit ID is set.
 */
export function adsConfig(): AdsConfig | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const a = ((Constants.expoConfig?.extra ?? {}) as Extra).ads;
  if (!a?.enabled) return null;
  const ios = Platform.OS === 'ios';
  const banner = (ios ? a.bannerIos : a.bannerAndroid) || null;
  const rewarded = (ios ? a.rewardedIos : a.rewardedAndroid) || null;
  if (!__DEV__ && !banner && !rewarded) return null;
  return { banner, rewarded };
}
