import Constants from 'expo-constants';

/** Where the moving-portrait clips are hosted (.env → app.config.ts → extra.portraits). Empty = none. */
export function portraitsBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { portraits?: { baseUrl?: string } };
  return (extra.portraits?.baseUrl ?? '').trim().replace(/\/+$/, '');
}
