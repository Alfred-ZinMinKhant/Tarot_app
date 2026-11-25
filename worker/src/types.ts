// Just the slice of Cloudflare's D1 API the Worker uses, so the app's typecheck needs no
// Cloudflare type packages and tests can back it with SQLite (sql.js).
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export type Env = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Signs the sign-in `state` so the Google callback can't be forged. */
  STATE_SECRET: string;
  /** Only redirects that start with this (the app's URL scheme) are allowed. */
  APP_REDIRECT_PREFIX: string;
};
