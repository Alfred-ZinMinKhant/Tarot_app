import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { cancelReminders, scheduleReminders } from '@/services/notifications';
import { useSettings } from '@/store/settings';

/**
 * Keeps the queued daily reminders in sync with the settings and the active language, and opens
 * the Card of the Day when a reminder is tapped. Mounted once in the root layout.
 */
export function useReminders(ready: boolean) {
  const { t, i18n } = useTranslation();
  const enabled = useSettings((s) => s.reminderEnabled);
  const hour = useSettings((s) => s.reminderHour);
  const minute = useSettings((s) => s.reminderMinute);
  const ensureSeed = useSettings((s) => s.ensureDeviceSeed);
  const language = i18n.language;

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const task = enabled
      ? scheduleReminders({
          hour,
          minute,
          seed: ensureSeed(),
          text: {
            title: t('notifications.title'),
            channelName: t('notifications.channelName'),
            teaser: {
              fire: t('notifications.teaserFire'),
              water: t('notifications.teaserWater'),
              air: t('notifications.teaserAir'),
              earth: t('notifications.teaserEarth'),
            },
          },
        })
      : cancelReminders();
    task.catch(() => undefined);
  }, [ready, enabled, hour, minute, language, t, ensureSeed]);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null | undefined) => {
      const url = response?.notification?.request?.content?.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as '/daily');
    };
    // A tap that launched the app, then taps while it is running.
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
