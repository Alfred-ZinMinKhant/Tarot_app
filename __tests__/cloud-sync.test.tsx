import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import en from '../locales/en.json';
import { fakeServices } from '../test/mocks/fakeCloud';

import { getJournalRepo, resetJournalRepo } from '@/db';
import { syncTiming } from '@/hooks/useCloudSync';
import { deleteAllUserData } from '@/services/userData';
import { useDaily } from '@/store/daily';
import { useJournal } from '@/store/journal';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { setSyncServices, useSync } from '@/store/sync';
import { useToast } from '@/store/toast';

const SIGNED_OUT = { status: 'signedOut', email: null, error: null, cursor: null, lastSyncedAt: null } as const;
let svc: ReturnType<typeof fakeServices>;

beforeEach(() => {
  resetJournalRepo();
  useJournal.setState({ readings: [], loaded: false, localChanges: 0 });
  useDaily.setState({ dateKey: null, draw: null, loading: false });
  useToast.setState({ current: null });
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
  useSync.setState({ ...SIGNED_OUT });
  svc = fakeServices();
  setSyncServices(svc);
});

afterEach(() => setSyncServices(undefined));

const save = (question: string) =>
  useJournal.getState().save({
    kind: 'spread',
    spreadId: 'one-card',
    topic: 'general',
    question,
    cards: [{ positionId: 'focus', cardId: 'major-01-magician', reversed: false }],
  });

describe('cloud backup', () => {
  it('is hidden when the build has no cloud backup', async () => {
    setSyncServices(null);
    renderRouter('./app', { initialUrl: '/settings' });
    await screen.findByTestId('screen-settings');
    expect(screen.queryByTestId('sync-card')).toBeNull();
  });

  it('signs in with an email code and uploads the existing journal', async () => {
    await save('Before signing in');
    renderRouter('./app', { initialUrl: '/settings' });

    fireEvent.changeText(await screen.findByTestId('sync-email'), 'not-an-email');
    fireEvent.press(screen.getByTestId('sync-send-code'));
    expect(await screen.findByText(en.sync.errors.badEmail)).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('sync-email'), ' Mya@Example.com ');
    fireEvent.press(screen.getByTestId('sync-send-code'));
    expect(await screen.findByTestId('sync-code')).toBeTruthy();
    expect(svc.auth.sentTo).toEqual(['mya@example.com']);

    fireEvent.changeText(screen.getByTestId('sync-code'), '000000');
    fireEvent.press(screen.getByTestId('sync-verify'));
    expect(await screen.findByText(en.sync.errors.badCode)).toBeTruthy();

    // Burmese digits typed on a Myanmar keyboard are accepted.
    fireEvent.changeText(screen.getByTestId('sync-code'), '၁၂၃၄၅၆');
    fireEvent.press(screen.getByTestId('sync-verify'));
    expect(await screen.findByTestId('sync-account')).toHaveTextContent('Backing up as mya@example.com');
    await waitFor(() => expect(svc.cloud.rows.size).toBe(1));
    expect([...svc.cloud.rows.values()][0]!.question).toBe('Before signing in');
    expect(useSync.getState().lastSyncedAt).not.toBeNull();
  });

  it('backs up new readings shortly after they are saved, and pulls from other devices', async () => {
    syncTiming.debounceMs = 50;
    useSync.setState({ status: 'idle', email: 'a@b.co' });
    svc.auth.email = 'a@b.co';
    renderRouter('./app', { initialUrl: '/journal' });
    await screen.findByTestId('screen-journal');
    await waitFor(() => expect(useSync.getState().lastSyncedAt).not.toBeNull()); // launch sync
    await act(async () => {
      await save('Synced later');
    });
    expect(svc.cloud.rows.size).toBe(0);
    await waitFor(() => expect(svc.cloud.rows.size).toBe(1));

    // Another device uploads a reading; the next sync brings it in and the journal list updates.
    await svc.backend.push([
      {
        id: '9b2f3c1e-0000-4000-8000-000000000001',
        kind: 'spread',
        spreadId: 'one-card',
        topic: 'love',
        question: 'From my other phone',
        notes: '',
        cards: [{ positionId: 'focus', cardId: 'cups-02-two', reversed: false }],
        dateKey: '2026-10-14',
        createdAt: Date.UTC(2026, 9, 14),
        updatedAt: Date.UTC(2026, 9, 14),
        deletedAt: null,
      },
    ]);
    await act(async () => {
      await useSync.getState().syncNow();
    });
    expect(await screen.findByText(/From my other phone/)).toBeTruthy();
    syncTiming.debounceMs = 4000;
  });

  it('shows a gentle error when offline and recovers later', async () => {
    useSync.setState({ status: 'idle', email: 'a@b.co' });
    svc.auth.email = 'a@b.co';
    await save('Q');
    svc.cloud.offline = true;
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('sync-now'));
    expect(await screen.findByText(en.sync.errors.syncFailed)).toBeTruthy();
    svc.cloud.offline = false;
    fireEvent.press(screen.getByTestId('sync-now'));
    await waitFor(() => expect(screen.queryByTestId('sync-error')).toBeNull());
    expect(svc.cloud.rows.size).toBe(1);
  });

  it('deletes the cloud account after confirmation but keeps local readings', async () => {
    useSync.setState({ status: 'idle', email: 'a@b.co' });
    svc.auth.email = 'a@b.co';
    await save('Keep me locally');
    await act(() => useSync.getState().syncNow().then(() => undefined));
    renderRouter('./app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('sync-delete-account'));
    fireEvent.press(await screen.findByTestId('sync-delete-confirm'));
    expect(await screen.findByText(en.sync.deleted)).toBeTruthy();
    expect(svc.auth.deleted).toBe(true);
    expect(svc.cloud.rows.size).toBe(0);
    expect(useSync.getState().status).toBe('signedOut');
    expect(useJournal.getState().readings).toHaveLength(1);
    // Signing in again would upload everything afresh.
    expect(await (await getJournalRepo()).pendingChanges()).toHaveLength(1);
  });

  it('Delete my data signs out of cloud backup without deleting the cloud copy', async () => {
    useSync.setState({ status: 'idle', email: 'a@b.co' });
    svc.auth.email = 'a@b.co';
    await save('Q');
    await useSync.getState().syncNow();
    await deleteAllUserData();
    expect(useSync.getState().status).toBe('signedOut');
    expect(svc.auth.email).toBeNull();
    expect(svc.cloud.rows.size).toBe(1);
    expect(useJournal.getState().readings).toEqual([]);
  });
});
