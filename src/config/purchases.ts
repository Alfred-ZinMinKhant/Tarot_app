import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type PurchasesConfig = { apiKey: string; entitlement: string };
export type LocalPaymentConfig = { url: string; name: string };

type Extra = {
  purchases?: { iosApiKey?: string; androidApiKey?: string; entitlement?: string };
  localPayment?: { url?: string; name?: string };
};

const extra = (): Extra => (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * RevenueCat settings for this platform (.env → app.config.ts → extra.purchases). Null when no
 * key is set: the build then has no paywall and every feature is unlocked.
 */
export function purchasesConfig(): PurchasesConfig | null {
  const p = extra().purchases ?? {};
  const apiKey = Platform.OS === 'ios' ? p.iosApiKey : Platform.OS === 'android' ? p.androidApiKey : undefined;
  if (!apiKey) return null;
  return { apiKey, entitlement: p.entitlement || 'premium' };
}

/** Optional local payment partner (e.g. a shop that sells Premium codes). Null when not set. */
export function localPaymentConfig(): LocalPaymentConfig | null {
  const l = extra().localPayment ?? {};
  return l.url && l.name ? { url: l.url, name: l.name } : null;
}
