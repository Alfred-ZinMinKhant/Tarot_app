/** Web preview: local notifications are not supported (the reminder setting is hidden on web). */
export const REMINDER_DAYS = 7;
export const CHANNEL_ID = 'daily-reminder';

export async function configureNotifications(): Promise<void> {}
export async function ensurePermission(): Promise<boolean> {
  return false;
}
export async function cancelReminders(): Promise<void> {}
export async function scheduleReminders(): Promise<number> {
  return 0;
}
