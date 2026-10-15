import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { playSound } from '@/services/sound';
import { useSettings } from '@/store/settings';

const ignore = () => undefined;

/**
 * Tactile and audio feedback for card actions. Vibration follows Settings → Vibration feedback
 * (never on web); sound follows Settings → Sound effects (off by default).
 */
export function useHaptics() {
  const vibrate = useSettings((s) => s.haptics) && Platform.OS !== 'web';
  const sound = useSettings((s) => s.soundEnabled);
  return useMemo(
    () => ({
      select: () => (vibrate ? Haptics.selectionAsync().catch(ignore) : undefined),
      shuffle: () => {
        if (sound) playSound('shuffle');
        if (vibrate) void Haptics.selectionAsync().catch(ignore);
      },
      flip: () => {
        if (sound) playSound('flip');
        if (vibrate) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
      },
      success: () => {
        if (sound) playSound('chime');
        if (vibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
      },
    }),
    [vibrate, sound],
  );
}
