import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useJournal } from '@/store/journal';
import { syncAvailable, useSync } from '@/store/sync';

/** Wait this long after the last journal change before uploading, so edits are batched. */
export const syncTiming = { debounceMs: 4000 };

/**
 * Keeps the cloud backup current when it's on: on launch, when the app returns to the
 * foreground, and shortly after any journal change. Failures are silent (shown in Settings) and
 * retried on the next trigger — the app never waits for the network.
 */
export function useCloudSync(): void {
  useEffect(() => {
    if (!syncAvailable()) return;
    const sync = () => void useSync.getState().syncNow();
    void useSync.getState().init().then(sync);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useJournal.subscribe((s, prev) => {
      if (s.localChanges === prev.localChanges) return;
      clearTimeout(timer);
      timer = setTimeout(sync, syncTiming.debounceMs);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, []);
}
