import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getJournalRepo } from '@/db';
import { type SyncCursor, type SyncServices, syncJournal } from '@/sync/engine';

import { useJournal } from './journal';

export type SyncStatus = 'signedOut' | 'codeSent' | 'idle' | 'syncing' | 'error';
export type SyncError = 'sendFailed' | 'badCode' | 'syncFailed' | 'deleteFailed' | 'badEmail';

type SyncState = {
  status: SyncStatus;
  /** Signed-in email, or the email a code was sent to. */
  email: string | null;
  error: SyncError | null;
  cursor: SyncCursor;
  lastSyncedAt: number | null;
  init: () => Promise<void>;
  sendCode: (email: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIGNED_OUT = { status: 'signedOut', email: null, error: null, cursor: null, lastSyncedAt: null } as const;

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
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
        } catch {
          set({ error: 'sendFailed' });
          return false;
        }
      },
      verifyCode: async (code) => {
        const { email } = get();
        if (!services || !email) return false;
        try {
          const signedIn = await services.auth.verifyCode(email, code.trim());
          // A new account starts from scratch: upload everything on this phone.
          await (await getJournalRepo()).markAllDirty();
          set({ status: 'idle', email: signedIn, error: null, cursor: null, lastSyncedAt: null });
        } catch {
          set({ error: 'badCode' });
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
            set({ status: 'idle', cursor: result.cursor, lastSyncedAt: Date.now() });
            if (result.pulled) await useJournal.getState().refresh();
            return true;
          } catch {
            set({ status: 'error', error: 'syncFailed' });
            return false;
          }
        })().finally(() => {
          running = null;
        });
        return running;
      },
      signOut: async () => {
        await services?.auth.signOut().catch(() => undefined);
        // If the user signs in again (maybe to another account) everything is uploaded afresh.
        await (await getJournalRepo()).markAllDirty();
        set({ ...SIGNED_OUT });
      },
      deleteCloudAccount: async () => {
        if (!services) return false;
        try {
          await services.auth.deleteAccount();
        } catch {
          set({ error: 'deleteFailed' });
          return false;
        }
        await (await getJournalRepo()).markAllDirty();
        set({ ...SIGNED_OUT });
        return true;
      },
    }),
    {
      name: 'nat-tarot.sync',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ email: s.email, status: s.status, cursor: s.cursor, lastSyncedAt: s.lastSyncedAt }),
      // Never resume mid-sync after a restart.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SyncState>;
        const status = p.status === 'syncing' || p.status === 'error' ? 'idle' : (p.status ?? current.status);
        return { ...current, ...p, status };
      },
    },
  ),
);
