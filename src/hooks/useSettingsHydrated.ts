import { useSyncExternalStore } from 'react';

import { useSettings } from '@/store/settings';

const subscribe = (onChange: () => void) => useSettings.persist.onFinishHydration(onChange);
const getSnapshot = () => useSettings.persist.hasHydrated();

/** True once persisted settings have been read from storage. */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
