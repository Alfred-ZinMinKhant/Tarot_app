import type { Env } from './types';
import {
  b64url,
  fromB64url,
  HttpError,
  json,
  randomToken,
  readJson,
  sha256b64url,
  sign,
  verifySignature,
} from './util';

const MINUTE = 60_000;
const DAY = 86_400_000;
const CODE_TTL = 5 * MINUTE;
const STATE_TTL = 10 * MINUTE;
export const SESSION_TTL = 180 * DAY;

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

/*
 * Sign-in, in short (OAuth code flow with PKCE between the app and this Worker):
 *   1. The app makes a random `verifier`, and opens /auth/google/start?redirect_uri&challenge=SHA256(verifier).
 *   2. We send the browser to Google. `state` carries the app's redirect and challenge, HMAC-signed,
 *      so this Worker keeps no per-login state.
 *   3. Google returns to /auth/google/callback. We swap Google's code for the person's identity
 *      (server to server, with the client secret), find or create the user, and bounce the browser
 *      back into the app with a one-time code that is only good with the matching verifier.
 *   4. The app POSTs {code, verifier} to /auth/token and gets a session token.
 */

const validRedirect = (env: Env, value: string | null): value is string =>
  !!value && value.length <= 300 && value.startsWith(env.APP_REDIRECT_PREFIX);

function backToApp(redirect: string, params: Record<string, string>): Response {
  const url = new URL(redirect);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { location: url.toString() } });
}

const callbackUrl = (url: URL) => `${url.origin}/auth/google/callback`;

export async function startGoogle(url: URL, env: Env): Promise<Response> {
  const redirect = url.searchParams.get('redirect_uri');
  const challenge = url.searchParams.get('challenge');
  if (!validRedirect(env, redirect)) throw new HttpError(400, 'Invalid redirect_uri');
  if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new HttpError(400, 'Invalid challenge');

  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ r: redirect, c: challenge, e: Date.now() + STATE_TTL, n: randomToken(8) }),
    ),
  );
  const state = `${payload}.${await sign(env.STATE_SECRET, payload)}`;
  const google = new URL(GOOGLE_AUTH);
  google.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(url),
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  }).toString();
  return new Response(null, { status: 302, headers: { location: google.toString() } });
}

type State = { r: string; c: string; e: number };

async function readState(env: Env, state: string | null): Promise<State> {
  const [payload, sig] = (state ?? '').split('.');
  if (!payload || !sig || !(await verifySignature(env.STATE_SECRET, payload, sig))) {
    throw new HttpError(400, 'Invalid state');
  }
  const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as State;
  if (parsed.e < Date.now() || !validRedirect(env, parsed.r)) throw new HttpError(400, 'Expired state');
  return parsed;
}

type GoogleClaims = { sub?: string; email?: string; email_verified?: boolean; aud?: string; iss?: string; exp?: number };

export async function googleCallback(url: URL, env: Env): Promise<Response> {
  const state = await readState(env, url.searchParams.get('state'));
  const code = url.searchParams.get('code');
  if (url.searchParams.get('error') || !code) {
    return backToApp(state.r, { error_description: url.searchParams.get('error') ?? 'Sign-in cancelled' });
  }

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(url),
      grant_type: 'authorization_code',
    }).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as { id_token?: string };
  if (!res.ok || !body.id_token) return backToApp(state.r, { error_description: 'Google sign-in failed' });

  // The ID token came straight from Google over TLS in exchange for our secret, so its signature
  // needn't be checked again; the claims below are still verified.
  const claims = JSON.parse(
    new TextDecoder().decode(fromB64url(body.id_token.split('.')[1] ?? '')),
  ) as GoogleClaims;
  const issuerOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  if (!claims.sub || claims.aud !== env.GOOGLE_CLIENT_ID || !issuerOk || (claims.exp ?? 0) * 1000 < Date.now()) {
    return backToApp(state.r, { error_description: 'Google sign-in failed' });
  }

  const now = Date.now();
  const user = await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, created_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email
     RETURNING id`,
  )
    .bind(crypto.randomUUID(), claims.sub, claims.email_verified ? (claims.email ?? null) : null, now)
    .first<{ id: string }>();
  if (!user) return backToApp(state.r, { error_description: 'Could not create account' });

  const authCode = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_codes WHERE expires_at < ?1').bind(now),
    env.DB.prepare(
      'INSERT INTO auth_codes (code_hash, user_id, challenge, expires_at) VALUES (?1, ?2, ?3, ?4)',
    ).bind(await sha256b64url(authCode), user.id, state.c, now + CODE_TTL),
  ]);
  return backToApp(state.r, { code: authCode });
}

export async function exchangeToken(req: Request, env: Env): Promise<Response> {
  const body = (await readJson(req, 2000)) as { code?: unknown; verifier?: unknown };
  if (typeof body.code !== 'string' || typeof body.verifier !== 'string' || body.verifier.length > 200) {
    throw new HttpError(400, 'Invalid request');
  }
  const now = Date.now();
  // Deleting while reading makes the code single-use, even for a wrong verifier.
  const found = await env.DB.prepare(
    'DELETE FROM auth_codes WHERE code_hash = ?1 RETURNING user_id, challenge, expires_at',
  )
    .bind(await sha256b64url(body.code))
    .first<{ user_id: string; challenge: string; expires_at: number }>();
  if (!found || found.expires_at < now || found.challenge !== (await sha256b64url(body.verifier))) {
    throw new HttpError(400, 'Invalid or expired code');
  }

  const token = randomToken();
  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?1')
    .bind(found.user_id)
    .first<{ email: string | null }>();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now),
    env.DB.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)',
    ).bind(await sha256b64url(token), found.user_id, now + SESSION_TTL, now),
  ]);
  return json({ token, email: user?.email ?? null });
}

/** The signed-in user for a request, or a 401. Active sessions are renewed so they don't lapse. */
export async function authenticate(req: Request, env: Env): Promise<{ userId: string; tokenHash: string }> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token.length > 200) throw new HttpError(401, 'Unauthorized');
  const tokenHash = await sha256b64url(token);
  const now = Date.now();
  const session = await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?1')
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: number }>();
  if (!session || session.expires_at < now) throw new HttpError(401, 'Unauthorized');
  if (session.expires_at - now < SESSION_TTL - DAY) {
    await env.DB.prepare('UPDATE sessions SET expires_at = ?1 WHERE token_hash = ?2')
      .bind(now + SESSION_TTL, tokenHash)
      .run();
  }
  return { userId: session.user_id, tokenHash };
}

export async function signOut(req: Request, env: Env): Promise<Response> {
  const { tokenHash } = await authenticate(req, env);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(tokenHash).run();
  return json({ signedOut: true });
}
