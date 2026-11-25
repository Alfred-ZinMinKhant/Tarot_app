import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { type OAuthProvider, signInMethods, syncConfig } from '@/config/sync';
import type { DailyDraw, SyncRecord } from '@/db/types';

import type { RemoteSettings, SyncAuth, SyncBackend, SyncCursor, SyncServices } from './engine';

/** The signed-in account as kept on this phone: an opaque session token from the sync Worker. */
export type Session = { token: string; email: string };

export interface SessionStore {
  get(): Promise<Session | null>;
  set(session: Session | null): Promise<void>;
}

const SESSION_KEY = 'mingalar.sync.session';

export const asyncStorageSession: SessionStore = {
  async get() {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw) as Partial<Session>;
      return typeof s.token === 'string' ? { token: s.token, email: s.email ?? '' } : null;
    } catch {
      return null;
    }
  },
  async set(session) {
    if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(SESSION_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Api = {
  baseUrl: string;
  session: SessionStore;
  fetch: typeof fetch;
};

async function request<T>(
  api: Api,
  method: string,
  path: string,
  body?: unknown,
  { auth = true }: { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const session = await api.session.get();
    if (!session) throw new ApiError(401, 'Not signed in');
    headers.authorization = `Bearer ${session.token}`;
  }
  const res = await api.fetch(`${api.baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && auth) await api.session.set(null); // expired or revoked: sign in again
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, detail?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function createWorkerBackend(api: Api): SyncBackend {
  return {
    async pull(cursor: SyncCursor, limit: number) {
      const query = new URLSearchParams({ limit: String(limit) });
      if (cursor) {
        query.set('at', cursor.at);
        query.set('id', cursor.id);
      }
      const page = await request<{ rows: SyncRecord[]; cursor: SyncCursor }>(
        api,
        'GET',
        `/v1/readings?${query}`,
      );
      return { rows: page.rows, cursor: page.cursor ?? cursor };
    },
    async push(rows) {
      if (rows.length) await request(api, 'POST', '/v1/readings', { rows });
    },
    async pullDraws() {
      return (await request<{ draws: DailyDraw[] }>(api, 'GET', '/v1/draws')).draws;
    },
    async pushDraws(draws) {
      if (draws.length) await request(api, 'POST', '/v1/draws', { draws });
    },
    async pullSettings() {
      return (await request<{ settings: RemoteSettings | null }>(api, 'GET', '/v1/settings')).settings;
    },
    async pushSettings(settings) {
      await request(api, 'PUT', '/v1/settings', settings);
    },
  };
}

/** SHA-256 of `text` as unpadded base64url (the PKCE `code_challenge`). */
async function challengeFor(text: string): Promise<string> {
  const b64 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const randomHex = async (bytes: number): Promise<string> =>
  Array.from(await Crypto.getRandomBytesAsync(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

export function createWorkerAuth(api: Api): SyncAuth {
  return {
    async currentEmail() {
      const session = await api.session.get();
      return session ? session.email || 'account' : null;
    },
    async sendCode() {
      throw new Error('Email sign-in is not available');
    },
    async verifyCode() {
      throw new Error('Email sign-in is not available');
    },
    async signInWithProvider(provider: OAuthProvider) {
      if (provider !== 'google') throw new Error(`${provider} sign-in is not available`);
      const verifier = await randomHex(32);
      const redirectTo = Linking.createURL('auth-callback');
      const start = `${api.baseUrl}/auth/google/start?${new URLSearchParams({
        redirect_uri: redirectTo,
        challenge: await challengeFor(verifier),
      })}`;
      const result = await WebBrowser.openAuthSessionAsync(start, redirectTo);
      if (result.type !== 'success') return null;
      const params = new URL(result.url).searchParams;
      const code = params.get('code');
      if (!code) throw new Error(params.get('error_description') ?? 'No code returned');
      const session = await request<{ token: string; email: string | null }>(
        api,
        'POST',
        '/auth/token',
        { code, verifier },
        { auth: false },
      );
      const email = session.email ?? 'Google account';
      await api.session.set({ token: session.token, email });
      return email;
    },
    async signOut() {
      // Revoking on the server is best effort; the phone forgets the session either way.
      await request(api, 'POST', '/auth/signout').catch(() => undefined);
      await api.session.set(null);
    },
    async deleteAccount() {
      await request(api, 'DELETE', '/v1/account');
      await api.session.set(null);
    },
  };
}

/** Real services for this build, or null when cloud backup is off or has no way to sign in here. */
export function workerServices(): SyncServices | null {
  const config = syncConfig();
  if (!config) return null;
  const methods = signInMethods(config, Platform.OS);
  // The Worker supports Google only, and has no email codes.
  const supported = { providers: methods.providers.filter((p) => p === 'google'), email: false };
  if (!supported.providers.length) return null;
  const api: Api = {
    baseUrl: config.url.replace(/\/+$/, ''),
    session: asyncStorageSession,
    fetch: (input, init) => fetch(input, init),
  };
  return { auth: createWorkerAuth(api), backend: createWorkerBackend(api), methods: supported };
}
