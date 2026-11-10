import { setAnalyticsEnabled, setAnalyticsService, track, trackScreen } from '@/analytics';
import type { AnalyticsService } from '@/analytics/service';
import { deleteAllUserData } from '@/services/userData';
import { useSettings } from '@/store/settings';
import { logError, setErrorSink } from '@/utils/log';

function fakeService() {
  const calls: { method: string; args: unknown[] }[] = [];
  const rec =
    (method: string) =>
    (...args: unknown[]) =>
      void calls.push({ method, args });
  const service: AnalyticsService = {
    capture: rec('capture'),
    screen: rec('screen'),
    register: rec('register'),
    captureException: rec('captureException'),
    setEnabled: rec('setEnabled'),
    reset: rec('reset'),
  };
  return { service, calls };
}

beforeEach(() => {
  setAnalyticsService(undefined);
  setErrorSink(null);
  useSettings.setState({ analyticsEnabled: true });
});

describe('analytics', () => {
  it('never creates the SDK while statistics are switched off', () => {
    const factory = jest.fn(() => fakeService().service);
    setAnalyticsEnabled(false, factory);
    track('card_opened', { card: 'the-fool' });
    expect(factory).not.toHaveBeenCalled();
  });

  it('starts on first switch-on and sends events, screens and handled errors', () => {
    const { service, calls } = fakeService();
    const factory = jest.fn(() => service);
    setAnalyticsEnabled(true, factory);
    setAnalyticsEnabled(true, factory);
    expect(factory).toHaveBeenCalledTimes(1);

    track('reading_completed', { spread: 'three-card', topic: 'love', asked_question: true });
    trackScreen('home');
    logError('journal.refresh', new Error('boom'));

    expect(calls).toEqual([
      { method: 'capture', args: ['reading_completed', { spread: 'three-card', topic: 'love', asked_question: true }] },
      { method: 'screen', args: ['home'] },
      { method: 'captureException', args: [new Error('boom'), { scope: 'journal.refresh', handled: true }] },
    ]);
  });

  it('stops sending when switched off again', () => {
    const { service, calls } = fakeService();
    setAnalyticsEnabled(true, () => service);
    setAnalyticsEnabled(false);
    track('data_exported');
    expect(calls).toEqual([{ method: 'setEnabled', args: [false] }]);
  });

  it('a build without a key sends nothing', () => {
    setAnalyticsEnabled(true, () => null);
    expect(() => track('data_exported')).not.toThrow();
  });

  it('Delete my data keeps the choice and resets the anonymous ID', async () => {
    const { service, calls } = fakeService();
    setAnalyticsEnabled(true, () => service);
    useSettings.setState({ analyticsEnabled: false, name: 'Aye' });
    await deleteAllUserData();
    expect(useSettings.getState().name).toBe('');
    expect(useSettings.getState().analyticsEnabled).toBe(false);
    expect(calls.some((c) => c.method === 'reset')).toBe(true);
  });
});
