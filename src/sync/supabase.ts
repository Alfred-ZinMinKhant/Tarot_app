import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { syncConfig } from '@/config/sync';
import type { SavedCard, SyncRecord } from '@/db/types';
import type { Topic } from '@/engine';

import type { SyncAuth, SyncBackend, SyncCursor, SyncServices } from './engine';

export const TABLE = 'journal_readings';

/** Row shape of `public.journal_readings` (see supabase/migrations). */
type Row = {
  id: string;
  kind: 'spread' | 'daily';
  spread_id: string;
  topic: string;
  question: string;
  notes: string;
  cards: SavedCard[];
  date_key: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  server_updated_at?: string;
};

const toRow = (r: SyncRecord): Row => ({
  id: r.id,
  kind: r.kind,
  spread_id: r.spreadId,
  topic: r.topic,
  question: r.question,
  notes: r.notes,
  cards: r.cards,
  date_key: r.dateKey,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  deleted_at: r.deletedAt,
});

const fromRow = (r: Row): SyncRecord => ({
  id: r.id,
  kind: r.kind,
  spreadId: r.spread_id,
  topic: r.topic as Topic,
  question: r.question,
  notes: r.notes,
  cards: r.cards,
  dateKey: r.date_key,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  deletedAt: r.deleted_at == null ? null : Number(r.deleted_at),
});

let client: SupabaseClient | null = null;

/** The Supabase client, or null when cloud backup isn't configured for this build. */
export function getSupabase(): SupabaseClient | null {
  const config = syncConfig();
  if (!config) return null;
  client ??= createClient(config.url, config.anonKey, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return client;
}

export function createSupabaseBackend(supabase: SupabaseClient): SyncBackend {
  return {
    async pull(cursor: SyncCursor, limit: number) {
      let query = supabase.from(TABLE).select('*').order('server_updated_at').order('id').limit(limit);
      if (cursor) {
        // Quoted because timestamps contain ':' '.' and '+', which are PostgREST syntax.
        const at = `"${cursor.at}"`;
        query = query.or(`server_updated_at.gt.${at},and(server_updated_at.eq.${at},id.gt.${cursor.id || '""'})`);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Row[];
      const last = rows[rows.length - 1];
      return {
        rows: rows.map(fromRow),
        cursor: last?.server_updated_at ? { at: last.server_updated_at, id: last.id } : cursor,
      };
    },
    async push(rows) {
      if (!rows.length) return;
      const { error } = await supabase.from(TABLE).upsert(rows.map(toRow), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    },
  };
}

export function createSupabaseAuth(supabase: SupabaseClient): SyncAuth {
  return {
    async currentEmail() {
      const { data } = await supabase.auth.getSession();
      return data.session?.user.email ?? null;
    },
    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new Error(error.message);
    },
    async verifyCode(email, code) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.session) throw new Error(error?.message ?? 'No session');
      return data.session.user.email ?? email;
    },
    async signOut() {
      await supabase.auth.signOut({ scope: 'local' });
    },
    async deleteAccount() {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw new Error(error.message);
      await supabase.auth.signOut({ scope: 'local' });
    },
  };
}

/** Real services for this build, or null when cloud backup is off. */
export function supabaseServices(): SyncServices | null {
  const supabase = getSupabase();
  return supabase ? { auth: createSupabaseAuth(supabase), backend: createSupabaseBackend(supabase) } : null;
}
