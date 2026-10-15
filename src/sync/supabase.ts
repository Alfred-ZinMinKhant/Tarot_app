import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { type OAuthProvider, signInMethods, syncConfig } from '@/config/sync';
import type { DailyDraw, SavedCard, SyncRecord } from '@/db/types';
import type { Topic } from '@/engine';

import type { SyncAuth, SyncBackend, SyncCursor, SyncServices } from './engine';

export const TABLE = 'journal_readings';
export const DRAWS_TABLE = 'daily_draws';
export const SETTINGS_TABLE = 'user_settings';

/** Row shape of `public.daily_draws`. */
type DrawRow = {
  date_key: string;
  card_id: string;
  reversed: boolean;
  revealed_at: number;
  reading_id: string | null;
};

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
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Provider sign-in comes back as a one-time code in the redirect URL (PKCE).
      flowType: 'pkce',
    },
  });
  return client;
}

export function createSupabaseBackend(supabase: SupabaseClient): SyncBackend {
  return {
    async pull(cursor: SyncCursor, limit: number) {
      let query = supabase
        .from(TABLE)
        .select('*')
        .order('server_updated_at')
        .order('id')
        .limit(limit);
      if (cursor) {
        // Quoted because timestamps contain ':' '.' and '+', which are PostgREST syntax.
        const at = `"${cursor.at}"`;
        query = query.or(
          `server_updated_at.gt.${at},and(server_updated_at.eq.${at},id.gt.${cursor.id || '""'})`,
        );
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
    async pullDraws() {
      // A year of draws is ~365 small rows, so the whole history is read in one go (up to 5,000).
      const { data, error } = await supabase
        .from(DRAWS_TABLE)
        .select('*')
        .order('date_key')
        .limit(5000);
      if (error) throw new Error(error.message);
      return ((data ?? []) as DrawRow[]).map((r): DailyDraw => ({
        dateKey: r.date_key,
        cardId: r.card_id,
        reversed: r.reversed,
        revealedAt: Number(r.revealed_at),
        readingId: r.reading_id,
      }));
    },
    async pushDraws(draws) {
      if (!draws.length) return;
      const rows: DrawRow[] = draws.map((d) => ({
        date_key: d.dateKey,
        card_id: d.cardId,
        reversed: d.reversed,
        revealed_at: d.revealedAt,
        reading_id: d.readingId,
      }));
      const { error } = await supabase
        .from(DRAWS_TABLE)
        .upsert(rows, { onConflict: 'user_id,date_key' });
      if (error) throw new Error(error.message);
    },
    async pullSettings() {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('data, updated_at')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data
        ? { data: (data.data ?? {}) as Record<string, unknown>, updatedAt: Number(data.updated_at) }
        : null;
    },
    async pushSettings(settings) {
      const { error } = await supabase
        .from(SETTINGS_TABLE)
        .upsert({ data: settings.data, updated_at: settings.updatedAt }, { onConflict: 'user_id' });
      if (error) throw new Error(error.message);
    },
  };
}

export function createSupabaseAuth(supabase: SupabaseClient): SyncAuth {
  return {
    async currentEmail() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      return user ? (user.email ?? String(user.app_metadata?.provider ?? 'account')) : null;
    },
    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
    },
    async verifyCode(email, code) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.session) throw new Error(error?.message ?? 'No session');
      return data.session.user.email ?? email;
    },
    async signInWithProvider(provider: OAuthProvider) {
      // Must be allow-listed in Supabase → Authentication → URL Configuration (`<scheme>://**`).
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw new Error(error?.message ?? 'No sign-in URL');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return null;
      const params = new URL(result.url).searchParams;
      const code = params.get('code');
      if (!code) throw new Error(params.get('error_description') ?? 'No code returned');
      const exchanged = await supabase.auth.exchangeCodeForSession(code);
      if (exchanged.error || !exchanged.data.session)
        throw new Error(exchanged.error?.message ?? 'No session');
      return exchanged.data.session.user.email ?? provider;
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

/** Real services for this build, or null when cloud backup is off or has no way to sign in here. */
export function supabaseServices(): SyncServices | null {
  const config = syncConfig();
  const supabase = getSupabase();
  if (!config || !supabase) return null;
  const methods = signInMethods(config, Platform.OS);
  if (!methods.providers.length && !methods.email) return null;
  return { auth: createSupabaseAuth(supabase), backend: createSupabaseBackend(supabase), methods };
}
