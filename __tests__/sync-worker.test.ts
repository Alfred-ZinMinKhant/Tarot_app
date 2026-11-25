/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';

import { handle, type Env } from '../worker/src';
import { b64url, sha256b64url } from '../worker/src/util';
import { fakeD1, openWorkerDb } from '../test/mocks/fakeD1';

const APP = 'mingalartarot://auth-callback';
const CLIENT_ID = 'client-123.apps.googleusercontent.com';

let env: Env;
let googleClaims: Record<string, unknown>;
const realFetch = globalThis.fetch;

beforeEach(async () => {
  const schema = readFileSync(join(__dirname, '../worker/migrations/0001_init.sql'), 'utf8');
  env = {
    DB: fakeD1(await openWorkerDb(schema)),
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: 'secret',
    STATE_SECRET: 'state-secret',
    APP_REDIRECT_PREFIX: 'mingalartarot://',
  };
  googleClaims = {
    sub: 'google-sub-1',
    email: 'a@example.com',
    email_verified: true,
    aud: CLIENT_ID,
    iss: 'https://accounts.google.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  // The only outbound call the Worker makes: Google's token endpoint.
  globalThis.fetch = jest.fn(async () => {
    const idToken = `h.${b64url(new TextEncoder().encode(JSON.stringify(googleClaims)))}.s`;
    return new Response(JSON.stringify({ id_token: idToken }), { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const call = (method: string, path: string, opts: { token?: string; body?: unknown } = {}) =>
  handle(
    new Request(`https://sync.test${path}`, {
      method,
      headers: {
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    env,
  );

/** Runs the whole sign-in as the app would, returning a session token. */
async function signIn(sub = 'google-sub-1', email = 'a@example.com') {
  googleClaims = { ...googleClaims, sub, email };
  const verifier = 'v'.repeat(64);
  const challenge = await sha256b64url(verifier);
  const start = await call(
    'GET',
    `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}&challenge=${challenge}`,
  );
  const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
  const back = await call('GET', `/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`);
  const code = new URL(back.headers.get('location')!).searchParams.get('code')!;
  const res = await call('POST', '/auth/token', { body: { code, verifier } });
  const { token } = (await res.json()) as { token: string };
  return { token, code, verifier };
}

const reading = (id: string, updatedAt: number, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'spread',
  spreadId: 'one-card',
  topic: 'love',
  question: 'ဘာဖြစ်မလဲ',
  notes: 'a note',
  cards: [{ positionId: 'focus', cardId: 'major-00-fool', reversed: true }],
  dateKey: '2026-11-10',
  createdAt: 1000,
  updatedAt,
  deletedAt: null,
  ...extra,
});

describe('sign-in', () => {
  it('sends the browser to Google with a signed state and returns an app code', async () => {
    const challenge = await sha256b64url('verifier');
    const start = await call(
      'GET',
      `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}&challenge=${challenge}`,
    );
    expect(start.status).toBe(302);
    const google = new URL(start.headers.get('location')!);
    expect(google.origin + google.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(google.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(google.searchParams.get('redirect_uri')).toBe('https://sync.test/auth/google/callback');
    expect(google.searchParams.get('scope')).toBe('openid email');

    const { token } = await signIn();
    expect(token.length).toBeGreaterThan(30);
  });

  it('only redirects into the app, and wants a PKCE challenge', async () => {
    const challenge = await sha256b64url('x');
    const evil = await call(
      'GET',
      `/auth/google/start?redirect_uri=${encodeURIComponent('https://evil.example/steal')}&challenge=${challenge}`,
    );
    expect(evil.status).toBe(400);
    const noChallenge = await call('GET', `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}`);
    expect(noChallenge.status).toBe(400);
  });

  it('rejects a forged or tampered state at the callback', async () => {
    const res = await call('GET', '/auth/google/callback?code=x&state=abc.def');
    expect(res.status).toBe(400);
  });

  it('passes a cancelled Google sign-in back to the app as an error', async () => {
    const challenge = await sha256b64url('v');
    const start = await call(
      'GET',
      `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}&challenge=${challenge}`,
    );
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const back = await call('GET', `/auth/google/callback?error=access_denied&state=${encodeURIComponent(state)}`);
    expect(new URL(back.headers.get('location')!).searchParams.get('error_description')).toBe('access_denied');
  });

  it('refuses an ID token meant for another app', async () => {
    googleClaims.aud = 'someone-else';
    const challenge = await sha256b64url('v');
    const start = await call(
      'GET',
      `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}&challenge=${challenge}`,
    );
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const back = await call('GET', `/auth/google/callback?code=c&state=${encodeURIComponent(state)}`);
    const params = new URL(back.headers.get('location')!).searchParams;
    expect(params.get('code')).toBeNull();
    expect(params.get('error_description')).toBeTruthy();
  });

  it('makes the app code single-use and tied to the verifier', async () => {
    const { code, verifier } = await signIn();
    const again = await call('POST', '/auth/token', { body: { code, verifier } });
    expect(again.status).toBe(400); // already used by signIn()

    // A wrong verifier burns the code, so a stolen code is useless.
    googleClaims = { ...googleClaims };
    const challenge = await sha256b64url(verifier);
    const start = await call(
      'GET',
      `/auth/google/start?redirect_uri=${encodeURIComponent(APP)}&challenge=${challenge}`,
    );
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const back = await call('GET', `/auth/google/callback?code=g&state=${encodeURIComponent(state)}`);
    const fresh = new URL(back.headers.get('location')!).searchParams.get('code')!;
    expect((await call('POST', '/auth/token', { body: { code: fresh, verifier: 'wrong' } })).status).toBe(400);
    expect((await call('POST', '/auth/token', { body: { code: fresh, verifier } })).status).toBe(400);
  });

  it('keeps one account per Google user across sign-ins', async () => {
    const a = await signIn();
    const b = await signIn();
    await call('POST', '/v1/readings', { token: a.token, body: { rows: [reading('r1', 10)] } });
    const pulled = await (await call('GET', '/v1/readings', { token: b.token })).json();
    expect((pulled as { rows: unknown[] }).rows).toHaveLength(1);
  });

  it('signs out by revoking the session', async () => {
    const { token } = await signIn();
    expect((await call('POST', '/auth/signout', { token })).status).toBe(200);
    expect((await call('GET', '/v1/settings', { token })).status).toBe(401);
  });
});

describe('access control', () => {
  it('needs a valid session for every data route', async () => {
    expect((await call('GET', '/v1/readings')).status).toBe(401);
    expect((await call('GET', '/v1/readings', { token: 'nope' })).status).toBe(401);
    expect((await call('GET', '/nothing')).status).toBe(404);
    expect((await call('GET', '/health')).status).toBe(200);
  });

  it('never shows one account the data of another', async () => {
    const a = await signIn('sub-a', 'a@example.com');
    const b = await signIn('sub-b', 'b@example.com');
    await call('POST', '/v1/readings', { token: a.token, body: { rows: [reading('shared-id', 10)] } });
    await call('PUT', '/v1/settings', { token: a.token, body: { data: { theme: 'dark' }, updatedAt: 5 } });
    const rowsB = (await (await call('GET', '/v1/readings', { token: b.token })).json()) as { rows: unknown[] };
    expect(rowsB.rows).toHaveLength(0);
    // B pushing a reading with A's id creates B's own copy and leaves A's untouched.
    await call('POST', '/v1/readings', { token: b.token, body: { rows: [reading('shared-id', 99, { notes: 'mine' })] } });
    const rowsA = (await (await call('GET', '/v1/readings', { token: a.token })).json()) as {
      rows: { notes: string }[];
    };
    expect(rowsA.rows[0]!.notes).toBe('a note');
    const settingsB = (await (await call('GET', '/v1/settings', { token: b.token })).json()) as { settings: unknown };
    expect(settingsB.settings).toBeNull();
  });
});

describe('journal readings', () => {
  it('pulls the change feed after a (time, id) cursor, oldest first', async () => {
    const { token } = await signIn();
    await call('POST', '/v1/readings', { token, body: { rows: [reading('b', 10), reading('a', 10)] } });
    const first = (await (await call('GET', '/v1/readings?limit=1', { token })).json()) as {
      rows: { id: string; cards: unknown }[];
      cursor: { at: string; id: string };
    };
    expect(first.rows.map((r) => r.id)).toEqual(['a']);
    expect(first.rows[0]!.cards).toEqual([{ positionId: 'focus', cardId: 'major-00-fool', reversed: true }]);
    const next = (await (
      await call('GET', `/v1/readings?at=${encodeURIComponent(first.cursor.at)}&id=${first.cursor.id}`, { token })
    ).json()) as { rows: { id: string }[] };
    expect(next.rows.map((r) => r.id)).toEqual(['b']);
  });

  it('keeps the newer version: last write wins on the device clock', async () => {
    const { token } = await signIn();
    const notes = async () =>
      ((await (await call('GET', '/v1/readings', { token })).json()) as { rows: { notes: string }[] }).rows[0]!.notes;
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 100, { notes: 'new' })] } });
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 50, { notes: 'stale' })] } });
    expect(await notes()).toBe('new');
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 100, { notes: 'same time' })] } });
    expect(await notes()).toBe('new');
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 101, { notes: 'newer' })] } });
    expect(await notes()).toBe('newer');
  });

  it('stores deletions as tombstones with no text', async () => {
    const { token } = await signIn();
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 10)] } });
    await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 20, { deletedAt: 20 })] } });
    const { rows } = (await (await call('GET', '/v1/readings', { token })).json()) as {
      rows: { question: string; notes: string; deletedAt: number }[];
    };
    expect(rows[0]).toMatchObject({ question: '', notes: '', deletedAt: 20 });
  });

  it('rejects malformed rows without storing any of them', async () => {
    const { token } = await signIn();
    const bad = [
      { rows: [reading('ok', 1), { ...reading('x', 1), kind: 'nope' }] },
      { rows: [{ ...reading('x', 1), dateKey: 'yesterday' }] },
      { rows: [{ ...reading('x', 1), updatedAt: 'now' }] },
      { rows: [{ ...reading('x', 1), cards: 'none' }] },
      { rows: 'not a list' },
    ];
    for (const body of bad) expect((await call('POST', '/v1/readings', { token, body })).status).toBe(400);
    const { rows } = (await (await call('GET', '/v1/readings', { token })).json()) as { rows: unknown[] };
    expect(rows).toHaveLength(0);
  });
});

describe('daily draws', () => {
  const draw = (readingId: string | null, cardId = 'major-00-fool') => ({
    dateKey: '2026-11-10',
    cardId,
    reversed: false,
    revealedAt: 5,
    readingId,
  });

  it('keeps the first reveal of a day and only adds a missing journal link', async () => {
    const { token } = await signIn();
    await call('POST', '/v1/draws', { token, body: { draws: [draw(null)] } });
    await call('POST', '/v1/draws', { token, body: { draws: [draw('reading-1', 'major-01-magician')] } });
    await call('POST', '/v1/draws', { token, body: { draws: [draw(null, 'major-02-priestess')] } });
    const { draws } = (await (await call('GET', '/v1/draws', { token })).json()) as {
      draws: { cardId: string; reversed: boolean; readingId: string | null }[];
    };
    expect(draws).toEqual([
      { dateKey: '2026-11-10', cardId: 'major-00-fool', reversed: false, revealedAt: 5, readingId: 'reading-1' },
    ]);
  });
});

describe('settings', () => {
  it('keeps the newer settings', async () => {
    const { token } = await signIn();
    const get = async () => (await (await call('GET', '/v1/settings', { token })).json()) as {
      settings: { data: { theme: string }; updatedAt: number } | null;
    };
    expect((await get()).settings).toBeNull();
    await call('PUT', '/v1/settings', { token, body: { data: { theme: 'dark' }, updatedAt: 10 } });
    await call('PUT', '/v1/settings', { token, body: { data: { theme: 'old' }, updatedAt: 5 } });
    expect((await get()).settings).toEqual({ data: { theme: 'dark' }, updatedAt: 10 });
    await call('PUT', '/v1/settings', { token, body: { data: { theme: 'light' }, updatedAt: 11 } });
    expect((await get()).settings?.data.theme).toBe('light');
    expect((await call('PUT', '/v1/settings', { token, body: { data: [], updatedAt: 1 } })).status).toBe(400);
  });
});

describe('account deletion', () => {
  it('removes the account, its data and its sessions, and leaves other accounts alone', async () => {
    const a = await signIn('sub-a', 'a@example.com');
    const b = await signIn('sub-b', 'b@example.com');
    for (const { token } of [a, b]) {
      await call('POST', '/v1/readings', { token, body: { rows: [reading('r', 10)] } });
      await call('POST', '/v1/draws', { token, body: { draws: [draw()] } });
      await call('PUT', '/v1/settings', { token, body: { data: { theme: 'dark' }, updatedAt: 1 } });
    }
    expect((await call('DELETE', '/v1/account', { token: a.token })).status).toBe(200);
    expect((await call('GET', '/v1/readings', { token: a.token })).status).toBe(401);

    const count = async (table: string) =>
      (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n;
    for (const table of ['users', 'sessions', 'journal_readings', 'daily_draws', 'user_settings']) {
      expect(await count(table)).toBe(1); // only b's rows are left
    }
    expect(((await (await call('GET', '/v1/readings', { token: b.token })).json()) as { rows: unknown[] }).rows).toHaveLength(1);
  });

  function draw() {
    return { dateKey: '2026-11-10', cardId: 'major-00-fool', reversed: true, revealedAt: 5, readingId: null };
  }
});
