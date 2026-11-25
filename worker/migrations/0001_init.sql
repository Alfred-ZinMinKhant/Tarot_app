-- Mingalar Tarot cloud backup (Cloudflare D1). Apply with `npm run worker:migrate`.
-- Every row is scoped by user_id and the Worker adds that filter to every query.
-- Deletes of journal readings are tombstones (deleted_at set) so they reach the user's other devices.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at INTEGER NOT NULL
);

-- One-time sign-in codes handed to the app after Google sign-in; bound to the app's PKCE challenge.
CREATE TABLE auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Opaque bearer tokens, stored hashed (SHA-256), so a database leak does not leak sessions.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE journal_readings (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('spread', 'daily')),
  spread_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  cards TEXT NOT NULL DEFAULT '[]',
  date_key TEXT NOT NULL,
  -- Device clock, milliseconds since 1970. Used for last-write-wins.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  -- Server clock (ISO 8601, UTC); the order in which devices pull changes.
  server_updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX journal_readings_feed ON journal_readings (user_id, server_updated_at, id);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE daily_draws (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  card_id TEXT NOT NULL,
  reversed INTEGER NOT NULL,
  revealed_at INTEGER NOT NULL,
  -- The journal entry saved from this draw (no foreign key: readings sync independently).
  reading_id TEXT,
  PRIMARY KEY (user_id, date_key)
);
