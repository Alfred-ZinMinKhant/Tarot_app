# Cloud backup Worker (Cloudflare Workers + D1)

Mingalar Tarot works fully offline. Cloud backup of the journal is only compiled in when
`ENABLE_CLOUD_SYNC=true` and `SYNC_URL` (this Worker's address) are set in `.env` / EAS.
Everything below fits Cloudflare's free plan (100k Worker requests a day, 5 GB of D1). The data is a
few KB per person.

## What it does

| Route | Purpose |
| --- | --- |
| `GET /auth/google/start`, `GET /auth/google/callback` | Google sign-in (OAuth code flow) that ends by redirecting into the app with a one-time code |
| `POST /auth/token` | Swaps that code plus the app's PKCE verifier for a session token |
| `POST /auth/signout` | Revokes the session |
| `GET/POST /v1/readings` | Journal change feed (cursor on `(server_updated_at, id)`) and last-write-wins upsert |
| `GET/POST /v1/draws` | Card of the Day history (first reveal of a day wins) |
| `GET/PUT /v1/settings` | Portable settings, last write wins |
| `DELETE /v1/account` | Deletes the account and everything stored with it |

Sessions are random tokens stored hashed in D1. Every query is scoped by the signed-in `user_id`.
What is synced: journal readings (question, notes, cards, dates) and deletions; portable settings
(language, theme, text size, Burmese font and numerals, reversed cards, haptics, sound, reminder
time, weekday sign, birth chart details, finished lessons); and the Card of the Day history. Not
synced: the name, the private device seed, the reminder on/off switch, the onboarding flag and the
free share count.

## Set up

Run these from the project root (Node 22). `wrangler` is fetched on demand by `npx`.

1. **Log in and create the database**

   ```sh
   npx wrangler@4 login
   npx wrangler@4 d1 create mingalar-sync     # copy the printed database_id into worker/wrangler.toml
   npm run worker:migrate                      # applies worker/migrations/*.sql
   ```

2. **Google OAuth client.** Google Cloud Console → APIs & Services → Credentials → a **Web
   application** client. Add this authorized redirect URI (use your Worker's real address):
   `https://mingalar-sync.<account>.workers.dev/auth/google/callback`.

3. **Secrets**

   ```sh
   npx wrangler@4 secret put GOOGLE_CLIENT_ID     --config worker/wrangler.toml
   npx wrangler@4 secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
   openssl rand -base64 32 | npx wrangler@4 secret put STATE_SECRET --config worker/wrangler.toml
   ```

4. **Deploy**: `npm run worker:deploy`, then put the printed URL in `SYNC_URL` (`.env` for local
   builds, EAS environment variables for store builds) with `ENABLE_CLOUD_SYNC=true`, and rebuild.

Local development: `npm run worker:dev` (add the local callback URI to the Google client).

## Operations

- **Backups:** D1 Time Travel restores to any minute of the last 7 days
  (`npx wrangler@4 d1 time-travel restore mingalar-sync --timestamp=<time>`).
- **Abuse:** the Worker caps request and field sizes. If it is ever hammered, add a Cloudflare
  rate-limiting rule on `/auth/*`.
- **Tests:** `npm test` runs the Worker's SQL on real SQLite (sql.js) in `__tests__/sync-worker.test.ts`.
