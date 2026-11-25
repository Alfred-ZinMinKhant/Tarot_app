import { authenticate, exchangeToken, googleCallback, signOut, startGoogle } from './auth';
import {
  deleteAccount,
  pullDraws,
  pullReadings,
  pullSettings,
  pushDraws,
  pushReadings,
  pushSettings,
} from './data';
import type { Env } from './types';
import { HttpError, json } from './util';

export type { Env } from './types';

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;

  switch (key) {
    case 'GET /':
    case 'GET /health':
      return json({ ok: true });
    case 'GET /auth/google/start':
      return startGoogle(url, env);
    case 'GET /auth/google/callback':
      return googleCallback(url, env);
    case 'POST /auth/token':
      return exchangeToken(req, env);
    case 'POST /auth/signout':
      return signOut(req, env);
  }

  if (!url.pathname.startsWith('/v1/')) throw new HttpError(404, 'Not found');
  const { userId } = await authenticate(req, env);
  switch (key) {
    case 'GET /v1/readings':
      return pullReadings(url, env, userId);
    case 'POST /v1/readings':
      return pushReadings(req, env, userId);
    case 'GET /v1/draws':
      return pullDraws(env, userId);
    case 'POST /v1/draws':
      return pushDraws(req, env, userId);
    case 'GET /v1/settings':
      return pullSettings(env, userId);
    case 'PUT /v1/settings':
      return pushSettings(req, env, userId);
    case 'DELETE /v1/account':
      return deleteAccount(env, userId);
  }
  throw new HttpError(404, 'Not found');
}

export async function handle(req: Request, env: Env): Promise<Response> {
  try {
    return await route(req, env);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('Unhandled error', e);
    return json({ error: 'Internal error' }, 500);
  }
}

export default { fetch: handle };
