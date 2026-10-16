import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { OAuthProvider, SyncMethods } from '@/config/sync';
import { getJournalRepo } from '@/db';
import {
  type SyncCursor,
  type SyncServices,
  syncDraws,
  syncJournal,
  syncSettings,
} from '@/sync/engine';
import { pickSynced, sanitizeSettings, syncedChanged } from '@/sync/settingsData';

import { logError } from '@/utils/log';
import { useDaily } from './daily';
import { useJournal } from './journal';
import { useSettings } from './settings';

export type SyncStatus = 'signedOut' | 'codeSent' | 'idle' | 'syncing' | 'error';
export type SyncError =
  'oauthFailed' | 'sendFailed' | 'badCode' | 'syncFailed' | 'deleteFailed' | 'badEmail';

type SyncState = {
  status: SyncStatus;
  /** Signed-in email, or the email a code was sent to. */
  email: string | null;
  error: SyncError | null;
  cursor: SyncCursor;
  lastSyncedAt: number | null;
  /** When this phone last changed a synced setting; 0 = not since signing in. */
  settingsChangedAt: number;
  init: () => Promise<void>;
  sendCode: (email: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  /** Provider (Google/Apple) sign-in. Returns false if it failed or the person backed out. */
  signInWithProvider: (provider: OAuthProvider) => Promise<boolean>;
  cancelCode: () => void;
  syncNow: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteCloudAccount: () => Promise<boolean>;
};

/** undefined = not wired yet; null = cloud backup unavailable in this build. */
let services: SyncServices | null | undefined;
let running: Promise<boolean> | null = null;

/** Wires the store to Supabase (or to fakes in tests). `null` = cloud backup unavailable. */
export function setSyncServices(next: SyncServices | null | undefined): void {
  services = next;
}

/** Wires the real services unless something (a test) already did. */
export function ensureSyncServices(create: () => SyncServices | null): void {
  if (services === undefined) services = create();
}

export const syncAvailable = (): boolean => !!services;

/** Ways to sign in on this build/platform (empty when cloud backup is unavailable). */
export const syncMethods = (): SyncMethods => services?.methods ?? { providers: [], email: false };

let applyingRemoteSettings = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIGNED_OUT = {
  status: 'signedOut',
  email: null,
  error: null,
  cursor: null,
  lastSyncedAt: null,
  settingsChangedAt: 0,
} as const;

export const useSync = create<SyncState>()(
  persist(
    (set, get) => {
      /** A new sign-in starts from scratch: upload everything on this phone. */
      const beginSession = async (account: string) => {
        await (await getJournalRepo()).markAllDirty();
        set({
          status: 'idle',
          email: account,
          error: null,
          cursor: null,
          lastSyncedAt: null,
          settingsChangedAt: 0,
        });
      };
      return {
        ...SIGNED_OUT,
        init: async () => {
          if (!services) return;
          const email = await services.auth.currentEmail().catch(() => null);
          if (email) set({ status: 'idle', email, error: null });
          else if (get().status !== 'codeSent') set({ ...SIGNED_OUT });
        },
        sendCode: async (raw) => {
          const email = raw.trim().toLowerCase();
          if (!EMAIL.test(email)) {
            set({ error: 'badEmail' });
            return false;
          }
          if (!services) return false;
          try {
            await services.auth.sendCode(email);
            set({ status: 'codeSent', email, error: null });
            return true;
          } catch (e) {
            logError('sync.sendCode', e);
            set({ error: 'sendFailed' });
            return false;
          }
        },
        verifyCode: async (code) => {
          const { email } = get();
          if (!services || !email) return false;
          try {
            await beginSession(await services.auth.verifyCode(email, code.trim()));
          } catch (e) {
            logError('sync.verifyCode', e);
            set({ error: 'badCode' });
            return false;
          }
          return get().syncNow();
        },
        signInWithProvider: async (provider) => {
          if (!services) return false;
          try {
            const account = await services.auth.signInWithProvider(provider);
            if (!account) return false;
            await beginSession(account);
          } catch (e) {
            logError('sync.signInWithProvider', e);
            set({ error: 'oauthFailed' });
            return false;
          }
          return get().syncNow();
        },
        cancelCode: () => set({ ...SIGNED_OUT }),
        syncNow: () => {
          running ??= (async () => {
            const { status } = get();
            if (!services || status === 'signedOut' || status === 'codeSent') return false;
            set({ status: 'syncing', error: null });
            try {
              const repo = await getJournalRepo();
              const result = await syncJournal(repo, services.backend, get().cursor);
              const draws = await syncDraws(repo, services.backend);
              const settings = await syncSettings(services.backend, {
                changedAt: get().settingsChangedAt,
                snapshot: () => pickSynced(useSettings.getState()),
                apply: (data) => {
                  applyingRemoteSettings = true;
                  try {
                    useSettings.setState(sanitizeSettings(data));
                  } finally {
                    applyingRemoteSettings = false;
                  }
                },
              });
              set({
                status: 'idle',
                cursor: result.cursor,
                lastSyncedAt: Date.now(),
                settingsChangedAt: settings.updatedAt,
              });
              if (result.pulled) await useJournal.getState().refresh();
              if (draws.pulled) await useDaily.getState().load();
              return true;
            } catch (e) {
              logError('sync.syncNow', e);
              set({ status: 'error', error: 'syncFailed' });
              return false;
            }
          })().finally(() => {
            running = null;
          });
          return running;
        },
        signOut: async () => {
          await services?.auth.signOut().catch((e) => logError('sync.signOut', e));
          // If the user signs in again (maybe to another account) everything is uploaded afresh.
          await (await getJournalRepo()).markAllDirty();
          set({ ...SIGNED_OUT });
        },
        deleteCloudAccount: async () => {
          if (!services) return false;
          try {
            await services.auth.deleteAccount();
          } catch (e) {
            logError('sync.deleteAccount', e);
            set({ error: 'deleteFailed' });
            return false;
          }
          await (await getJournalRepo()).markAllDirty();
          set({ ...SIGNED_OUT });
          return true;
        },
      };
    },
    {
      name: 'nat-tarot.sync',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        email: s.email,
        status: s.status,
        cursor: s.cursor,
        lastSyncedAt: s.lastSyncedAt,
        settingsChangedAt: s.settingsChangedAt,
      }),
      // Never resume mid-sync after a restart.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SyncState>;
        const status =
          p.status === 'syncing' || p.status === 'error' ? 'idle' : (p.status ?? current.status);
        return { ...current, ...p, status };
      },
    },
  ),
);

/**
 * Remembers when a synced setting last changed on this phone (for last-write-wins). Ignored while
 * signed out, while storage is still loading, and for values that just arrived from the cloud.
 */
useSettings.subscribe((state, prev) => {
  if (applyingRemoteSettings || !useSettings.persist.hasHydrated() || !syncedChanged(state, prev))
    return;
  const { status } = useSync.getState();
  if (status === 'signedOut' || status === 'codeSent') return;
  useSync.setState({ settingsChangedAt: Date.now() });
});
