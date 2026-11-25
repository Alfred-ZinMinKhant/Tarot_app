import * as WebBrowser from 'expo-web-browser';

import {
  ApiError,
  type Api,
  createWorkerAuth,
  createWorkerBackend,
  type Session,
  type SessionStore,
} from '@/sync/cloudflare';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
  // 0xAB... bytes; digest of the verifier is a fixed base64 string with every URL-unsafe character.
  getRandomBytesAsync: async (n: number) => new Uint8Array(n).fill(171),
  digestStringAsync: async () => 'a+b/c==',
}));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `mingalartarot://${path}` }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

function setup(responses: ({ status?: number; body?: unknown } | Error)[], session: Session | null = null) {
  const calls: Call[] = [];
  let stored = session;
  const store: SessionStore = {
    get: async () => stored,
    set: async (s) => {
      stored = s;
    },
  };
  const queue = [...responses];
  const api: Api = {
    baseUrl: 'https://sync.test',
    session: store,
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
        body: init.body ? JSON.parse(init.body as string) : undefined,
      });
      const next = queue.shift() ?? { body: {} };
      if (next instanceof Error) throw next;
      return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200 });
    }) as typeof fetch,
  };
  return { api, calls, current: () => stored };
}

const signedIn: Session = { token: 'tok', email: 'a@example.com' };

describe('Worker backend', () => {
  it('pulls the change feed with the cursor and a bearer token', async () => {
    const row = { id: 'r1', updatedAt: 5 };
    const { api, calls } = setup(
      [{ body: { rows: [row], cursor: { at: '2026-11-10T00:00:01.000Z', id: 'r1' } } }],
      signedIn,
    );
    const page = await createWorkerBackend(api).pull({ at: '2026-11-10T00:00:00.000Z', id: '' }, 500);
    expect(calls[0]!.url).toBe(
      'https://sync.test/v1/readings?limit=500&at=2026-11-10T00%3A00%3A00.000Z&id=',
    );
    expect(calls[0]!.headers.authorization).toBe('Bearer tok');
    expect(page).toEqual({ rows: [row], cursor: { at: '2026-11-10T00:00:01.000Z', id: 'r1' } });
  });

  it('keeps its own cursor when the server has nothing new', async () => {
    const { api } = setup([{ body: { rows: [], cursor: null } }], signedIn);
    const cursor = { at: '2026-11-10T00:00:00.000Z', id: 'x' };
    expect((await createWorkerBackend(api).pull(cursor, 10)).cursor).toBe(cursor);
  });

  it('skips the network when there is nothing to upload', async () => {
    const { api, calls } = setup([], signedIn);
    const backend = createWorkerBackend(api);
    await backend.push([]);
    await backend.pushDraws([]);
    expect(calls).toHaveLength(0);
  });

  it('uploads readings, draws and settings, and reads draws and settings back', async () => {
    const { api, calls } = setup(
      [{}, {}, {}, { body: { draws: [{ dateKey: 'd' }] } }, { body: { settings: null } }],
      signedIn,
    );
    const backend = createWorkerBackend(api);
    await backend.push([{ id: 'r' }] as never);
    await backend.pushDraws([{ dateKey: 'd' }] as never);
    await backend.pushSettings({ data: { theme: 'dark' }, updatedAt: 3 });
    expect(await backend.pullDraws()).toEqual([{ dateKey: 'd' }]);
    expect(await backend.pullSettings()).toBeNull();
    expect(calls.map((c) => `${c.method} ${c.url.replace('https://sync.test', '')}`)).toEqual([
      'POST /v1/readings',
      'POST /v1/draws',
      'PUT /v1/settings',
      'GET /v1/draws',
      'GET /v1/settings',
    ]);
    expect(calls[2]!.body).toEqual({ data: { theme: 'dark' }, updatedAt: 3 });
  });

  it('forgets an expired session and reports the server message', async () => {
    const { api, current } = setup([{ status: 401, body: { error: 'Unauthorized' } }], signedIn);
    await expect(createWorkerBackend(api).pullDraws()).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
    expect(current()).toBeNull();
  });

  it('refuses to call the server when signed out', async () => {
    const { api, calls } = setup([]);
    await expect(createWorkerBackend(api).pullSettings()).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(0);
  });
});

describe('Worker auth', () => {
  const openAuth = WebBrowser.openAuthSessionAsync as jest.Mock;
  beforeEach(() => openAuth.mockReset());

  it('signs in with Google through the Worker using PKCE', async () => {
    const { api, calls, current } = setup([{ body: { token: 'new-token', email: 'g@example.com' } }]);
    openAuth.mockResolvedValue({ type: 'success', url: 'mingalartarot://auth-callback?code=abc' });

    expect(await createWorkerAuth(api).signInWithProvider('google')).toBe('g@example.com');

    const [startUrl, redirect] = openAuth.mock.calls[0] as [string, string];
    expect(redirect).toBe('mingalartarot://auth-callback');
    const start = new URL(startUrl);
    expect(start.origin + start.pathname).toBe('https://sync.test/auth/google/start');
    expect(start.searchParams.get('redirect_uri')).toBe('mingalartarot://auth-callback');
    expect(start.searchParams.get('challenge')).toBe('a-b_c'); // base64 → base64url, unpadded
    expect(calls[0]).toMatchObject({ url: 'https://sync.test/auth/token', method: 'POST' });
    expect(calls[0]!.body).toEqual({ code: 'abc', verifier: 'ab'.repeat(32) });
    expect(calls[0]!.headers.authorization).toBeUndefined();
    expect(current()).toEqual({ token: 'new-token', email: 'g@example.com' });
  });

  it('returns null when the person closes the sign-in page', async () => {
    const { api, current } = setup([]);
    openAuth.mockResolvedValue({ type: 'cancel' });
    expect(await createWorkerAuth(api).signInWithProvider('google')).toBeNull();
    expect(current()).toBeNull();
  });

  it('surfaces a sign-in error from the redirect', async () => {
    const { api } = setup([]);
    openAuth.mockResolvedValue({
      type: 'success',
      url: 'mingalartarot://auth-callback?error_description=Google%20sign-in%20failed',
    });
    await expect(createWorkerAuth(api).signInWithProvider('google')).rejects.toThrow('Google sign-in failed');
  });

  it('only supports Google and has no email codes', async () => {
    const { api } = setup([]);
    const auth = createWorkerAuth(api);
    await expect(auth.signInWithProvider('apple')).rejects.toThrow('not available');
    await expect(auth.sendCode('a@b.co')).rejects.toThrow('not available');
    await expect(auth.verifyCode('a@b.co', '123456')).rejects.toThrow('not available');
  });

  it('reports the signed-in account', async () => {
    expect(await createWorkerAuth(setup([], signedIn).api).currentEmail()).toBe('a@example.com');
    expect(await createWorkerAuth(setup([], { token: 't', email: '' }).api).currentEmail()).toBe('account');
    expect(await createWorkerAuth(setup([]).api).currentEmail()).toBeNull();
  });

  it('signs out locally even if the server cannot be reached', async () => {
    const { api, current } = setup([new Error('offline')], signedIn);
    await createWorkerAuth(api).signOut();
    expect(current()).toBeNull();
  });

  it('deletes the account on the server before forgetting the session', async () => {
    const { api, calls, current } = setup([{ body: { deleted: true } }], signedIn);
    await createWorkerAuth(api).deleteAccount();
    expect(calls[0]).toMatchObject({ method: 'DELETE', url: 'https://sync.test/v1/account' });
    expect(current()).toBeNull();
  });

  it('keeps the session if the server refuses to delete the account', async () => {
    const { api, current } = setup([{ status: 500, body: { error: 'Internal error' } }], signedIn);
    await expect(createWorkerAuth(api).deleteAccount()).rejects.toThrow('Internal error');
    expect(current()).toEqual(signedIn);
  });
});
