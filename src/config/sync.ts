import Constants from 'expo-constants';

export type SyncConfig = { url: string; anonKey: string };

/**
 * Cloud backup is optional and off unless the build sets ENABLE_CLOUD_SYNC=true together with
 * SUPABASE_URL and SUPABASE_ANON_KEY (.env → app.config.ts → extra.sync).
 */
export function syncConfig(): SyncConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    sync?: { enabled?: boolean; url?: string; anonKey?: string };
  };
  const s = extra.sync;
  if (!s?.enabled || !s.url || !s.anonKey) return null;
  return { url: s.url, anonKey: s.anonKey };
}

export const isSyncAvailable = (): boolean => syncConfig() !== null;
