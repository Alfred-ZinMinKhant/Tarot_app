/**
 * Implements the app's `Db` interface on top of sql.js (SQLite compiled to JavaScript). Used by
 * the Jest suite so repository code runs against a real SQLite engine.
 */
import type { Database, SqlValue as SqlJsValue } from 'sql.js';

import type { Db, SqlValue } from './types';

export function sqlJsDb(db: Database): Db {
  const all = <T>(source: string, params: SqlValue[] = []): T[] => {
    const stmt = db.prepare(source);
    try {
      stmt.bind(params as SqlJsValue[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };
  let depth = 0;
  return {
    execAsync: async (source) => {
      db.exec(source);
    },
    runAsync: async (source, params = []) => {
      db.run(source, params as SqlJsValue[]);
      return { changes: db.getRowsModified() };
    },
    getAllAsync: async (source, params) => all(source, params),
    getFirstAsync: async (source, params) => all<never>(source, params)[0] ?? null,
    withTransactionAsync: async (task) => {
      if (depth > 0) return task();
      depth++;
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}

let sqlModule: ReturnType<typeof import('sql.js').default> | undefined;

/** Opens a fresh in-memory SQLite database (WebAssembly build with the binary inlined). */
export async function openSqlJsDatabase(): Promise<Db> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js/dist/sql-wasm-inline.js') as typeof import('sql.js').default;
  const SQL = await (sqlModule ??= initSqlJs());
  return sqlJsDb(new SQL.Database());
}
