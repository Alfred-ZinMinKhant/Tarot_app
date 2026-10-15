import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import en from '../locales/en.json';
import my from '../locales/my.json';
import * as fake from '../test/mocks/expoNotifications';

import { getCard } from '@/data/cards';
import { dailyCard } from '@/engine';
import { cancelReminders, planReminders, REMINDER_DAYS, scheduleReminders } from '@/services/notifications';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { localDateKey } from '@/utils/dates';
import { stripZwsp } from '@/utils/myanmar';

const text = {
  title: 'Title',
  channelName: 'Channel',
  teaser: { fire: 'FIRE', water: 'WATER', air: 'AIR', earth: 'EARTH' },
};

beforeEach(() => {
  fake.__reset();
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, deviceSeed: 'seed-1' });
});

describe('reminder planning', () => {
  it('plans one reminder per day at the chosen local time, starting today if it is still ahead', () => {
    const now = new Date(2026, 9, 15, 7, 30);
    const plans = planReminders({ hour: 8, minute: 15, seed: 'seed-1', text, now });
    expect(plans).toHaveLength(REMINDER_DAYS);
    expect(plans[0]!.date).toEqual(new Date(2026, 9, 15, 8, 15));
    expect(plans[6]!.date).toEqual(new Date(2026, 9, 21, 8, 15));
    for (const p of plans) {
      expect([p.date.getHours(), p.date.getMinutes()]).toEqual([8, 15]);
      expect(p.identifier).toBe(`daily-reminder-${localDateKey(p.date)}`);
    }
  });

  it('starts tomorrow when today’s time has passed', () => {
    const plans = planReminders({ hour: 8, minute: 0, seed: 's', text, now: new Date(2026, 9, 15, 9, 0) });
    expect(plans[0]!.date).toEqual(new Date(2026, 9, 16, 8, 0));
    expect(plans).toHaveLength(REMINDER_DAYS);
  });

  it('teases the element of that day’s card without naming it', () => {
    const plans = planReminders({ hour: 20, minute: 0, seed: 'seed-1', text, now: new Date(2026, 0, 1, 6) });
    for (const p of plans) {
      const card = getCard(dailyCard('seed-1', localDateKey(p.date)).cardId)!;
      expect(p.body).toBe(text.teaser[card.element]);
      expect(p.body).not.toContain(card.en.name);
    }
  });
});

describe('scheduling', () => {
  it('replaces the queue with a fresh week of date triggers', async () => {
    await scheduleReminders({ hour: 9, minute: 0, seed: 's', text, now: new Date(2026, 9, 15, 6) });
    await scheduleReminders({ hour: 9, minute: 0, seed: 's', text, now: new Date(2026, 9, 15, 6) });
    expect(fake.__scheduled).toHaveLength(REMINDER_DAYS);
    expect(fake.__scheduled[0]!.trigger).toMatchObject({ type: 'date', channelId: 'daily-reminder' });
    expect(fake.__scheduled[0]!.content).toMatchObject({ title: 'Title', data: { url: '/daily' } });
    await cancelReminders();
    expect(fake.__scheduled).toHaveLength(0);
  });
});

describe('reminder setting', () => {
  const normalizer = (s: string) => stripZwsp(s).trim();

  it('schedules reminders in the active language and reschedules when the language changes', async () => {
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent(await screen.findByTestId('toggle-reminder'), 'valueChange', true);
    await waitFor(() => expect(fake.__scheduled).toHaveLength(REMINDER_DAYS));
    expect(fake.__scheduled[0]!.content.title).toBe(en.notifications.title);
    expect(screen.getByTestId('reminder-time')).toHaveTextContent(/8:00/);

    fireEvent.press(screen.getByTestId('reminder-later'));
    await waitFor(() =>
      expect((fake.__scheduled.at(-1)!.trigger.date as Date).getMinutes()).toBe(15),
    );

    fireEvent.press(screen.getByTestId('settings-language-my'));
    await waitFor(() => expect(fake.__scheduled[0]!.content.title).toBe(my.notifications.title));
    expect(fake.__scheduled).toHaveLength(REMINDER_DAYS);

    fireEvent(screen.getByTestId('toggle-reminder'), 'valueChange', false);
    await waitFor(() => expect(fake.__scheduled).toHaveLength(0));
    expect(await screen.findByText(my.settings.reminder, { normalizer })).toBeTruthy();
  });

  it('stays off and explains when notifications are not allowed', async () => {
    fake.__permission.granted = false;
    fake.__permission.canAskAgain = false;
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent(await screen.findByTestId('toggle-reminder'), 'valueChange', true);
    expect(await screen.findByText(en.settings.permissionDenied, { normalizer })).toBeTruthy();
    expect(useSettings.getState().reminderEnabled).toBe(false);
    expect(fake.__scheduled).toHaveLength(0);
  });

  it('wraps the reminder time around midnight', () => {
    useSettings.getState().setReminderTime(23, 50);
    useSettings.getState().setReminderTime(23, 50 + 15);
    expect([useSettings.getState().reminderHour, useSettings.getState().reminderMinute]).toEqual([0, 5]);
    useSettings.getState().setReminderTime(0, -15);
    expect([useSettings.getState().reminderHour, useSettings.getState().reminderMinute]).toEqual([23, 45]);
  });
});
