/**
 * In-memory stand-in for expo-notifications under Jest (the real module needs native code).
 * Tests can inspect `__scheduled` and `__permission`.
 */
type Scheduled = { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> };

export const __scheduled: Scheduled[] = [];
export const __permission = { granted: true, canAskAgain: true, asked: 0 };

export const SchedulableTriggerInputTypes = { DATE: 'date', DAILY: 'daily' } as const;
export const AndroidImportance = { DEFAULT: 3 } as const;

export function __reset() {
  __scheduled.length = 0;
  __permission.granted = true;
  __permission.canAskAgain = true;
  __permission.asked = 0;
}

export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async () => null);
export const getPermissionsAsync = jest.fn(async () => ({ ...__permission }));
export const requestPermissionsAsync = jest.fn(async () => {
  __permission.asked++;
  return { ...__permission };
});
export const getAllScheduledNotificationsAsync = jest.fn(async () =>
  __scheduled.map((s) => ({ identifier: s.identifier, content: s.content, trigger: s.trigger })),
);
export const cancelScheduledNotificationAsync = jest.fn(async (id: string) => {
  const i = __scheduled.findIndex((s) => s.identifier === id);
  if (i >= 0) __scheduled.splice(i, 1);
});
export const scheduleNotificationAsync = jest.fn(async (req: Scheduled) => {
  __scheduled.push(req);
  return req.identifier;
});
export const getLastNotificationResponseAsync = jest.fn(async () => null);
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
