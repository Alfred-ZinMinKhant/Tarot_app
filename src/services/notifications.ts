/**
 * Local daily reminders. Each of the next REMINDER_DAYS days gets its own notification at the
 * chosen time, written in the active language, with a teaser drawn from that day's card element
 * (the card itself is never revealed). Rescheduled on app start and whenever the language, time
 * or toggle changes, so the queue is always a week ahead.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getCard } from '@/data/cards';
import type { Element } from '@/data/types';
import { dailyCard } from '@/engine';
import { localDateKey } from '@/utils/dates';

export const REMINDER_DAYS = 7;
export const CHANNEL_ID = 'daily-reminder';
const ID_PREFIX = 'daily-reminder-';

export type ReminderText = { title: string; teaser: Record<Element, string>; channelName: string };

export type ReminderPlan = { identifier: string; date: Date; title: string; body: string };

/** Pure planning step (tested): which reminders to schedule, at what time, with what text. */
export function planReminders({
  hour,
  minute,
  seed,
  text,
  now = new Date(),
  days = REMINDER_DAYS,
}: {
  hour: number;
  minute: number;
  seed: string;
  text: ReminderText;
  now?: Date;
  days?: number;
}): ReminderPlan[] {
  const plans: ReminderPlan[] = [];
  for (let offset = 0; plans.length < days && offset <= days; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute, 0, 0);
    if (date.getTime() <= now.getTime()) continue;
    const dateKey = localDateKey(date);
    const card = getCard(dailyCard(seed, dateKey).cardId)!;
    plans.push({ identifier: `${ID_PREFIX}${dateKey}`, date, title: text.title, body: text.teaser[card.element] });
  }
  return plans;
}

let configured = false;

/** Foreground presentation + Android channel. Safe to call more than once. */
export async function configureNotifications(channelName: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!configured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    configured = true;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replaces any queued reminders with a fresh week of them. Returns how many were scheduled. */
export async function scheduleReminders(options: Parameters<typeof planReminders>[0]): Promise<number> {
  if (Platform.OS === 'web') return 0;
  await configureNotifications(options.text.channelName);
  await cancelReminders();
  const plans = planReminders(options);
  for (const p of plans) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body, data: { url: '/daily' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
    });
  }
  return plans.length;
}
