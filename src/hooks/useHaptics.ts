import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';

const ignore = () => undefined;

/** Haptic feedback that respects Settings → Vibration feedback (and is a no-op on web). */
export function useHaptics() {
  const enabled = useSettings((s) => s.haptics) && Platform.OS !== 'web';
  return useMemo(
    () => ({
      select: () => (enabled ? Haptics.selectionAsync().catch(ignore) : undefined),
      flip: () => (enabled ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore) : undefined),
      success: () =>
        enabled ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore) : undefined,
    }),
    [enabled],
  );
}
