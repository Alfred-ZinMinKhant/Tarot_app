import type { Database, SqlValue } from 'sql.js';

import type { D1Database, D1PreparedStatement } from '../../worker/src/types';

/** A D1 look-alike on top of sql.js, so the Worker's SQL runs on a real SQLite engine in tests. */
export function fakeD1(db: Database): D1Database {
  const rows = <T>(sql: string, params: unknown[]): T[] => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params as SqlValue[]);
      const out: T[] = [];
      while (stmt.step()) out.push(stmt.getAsObject() as T);
      return out;
    } finally {
      stmt.free();
    }
  };
  const statement = (sql: string, params: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values),
    run: async () => {
      rows(sql, params);
    },
    all: async <T>() => ({ results: rows<T>(sql, params) }),
    first: async <T>() => rows<T>(sql, params)[0] ?? null,
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec('BEGIN');
      try {
        for (const s of statements) await s.run();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return [];
    },
  };
}

/** A fresh in-memory database with the Worker's schema applied. */
export async function openWorkerDb(schema: string): Promise<Database> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js/dist/sql-wasm-inline.js') as typeof import('sql.js').default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(schema);
  return db;
}
