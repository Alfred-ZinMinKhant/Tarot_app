import Constants from 'expo-constants';

export type OAuthProvider = 'google' | 'apple';
export type SyncMethods = { providers: OAuthProvider[]; email: boolean };
export type SyncConfig = {
  /** Base URL of the sync Worker (see worker/). */
  url: string;
  providers: OAuthProvider[];
  email: boolean;
};

/**
 * Cloud backup is optional and off unless the build sets ENABLE_CLOUD_SYNC=true together with
 * SYNC_URL, the sync Worker's address (.env → app.config.ts → extra.sync).
 */
export function syncConfig(): SyncConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    sync?: {
      enabled?: boolean;
      url?: string;
      providers?: string;
      email?: boolean;
    };
  };
  const s = extra.sync;
  if (!s?.enabled || !s.url) return null;
  const providers = (s.providers ?? 'google')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is OAuthProvider => p === 'google' || p === 'apple');
  return { url: s.url, providers: [...new Set(providers)], email: !!s.email };
}

/**
 * How people can sign in on this platform. App Store rule 4.8: an iOS app that offers Google must
 * also offer Sign in with Apple, so on iOS Google is only shown together with Apple.
 */
export function signInMethods(
  config: Pick<SyncConfig, 'providers' | 'email'>,
  os: string,
): SyncMethods {
  const providers = os === 'ios' && !config.providers.includes('apple') ? [] : config.providers;
  return { providers, email: config.email };
}

export const isSyncAvailable = (): boolean => syncConfig() !== null;
