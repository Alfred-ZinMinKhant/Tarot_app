import type { SyncRecord } from '@/db/types';
import type { SyncAuth, SyncBackend, SyncCursor, SyncServices } from '@/sync/engine';

type StoredRow = SyncRecord & { serverAt: string };

/**
 * In-memory stand-in for the Supabase table + trigger: keeps the newer `updatedAt`, stamps a
 * server time on every accepted write, and serves the change feed ordered by (serverAt, id).
 */
export class FakeCloud {
  rows = new Map<string, StoredRow>();
  private clock = Date.UTC(2026, 9, 15);
  offline = false;
  pushes = 0;

  private stamp(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  backend(): SyncBackend {
    return {
      pull: async (cursor: SyncCursor, limit: number) => {
        if (this.offline) throw new Error('offline');
        const after = (r: StoredRow) =>
          !cursor || r.serverAt > cursor.at || (r.serverAt === cursor.at && r.id > cursor.id);
        const rows = [...this.rows.values()]
          .filter(after)
          .sort((a, b) => (a.serverAt === b.serverAt ? (a.id < b.id ? -1 : 1) : a.serverAt < b.serverAt ? -1 : 1))
          .slice(0, limit);
        const last = rows[rows.length - 1];
        return {
          rows: rows.map(({ serverAt: _s, ...r }) => ({ ...r })),
          cursor: last ? { at: last.serverAt, id: last.id } : cursor,
        };
      },
      push: async (rows) => {
        if (this.offline) throw new Error('offline');
        this.pushes++;
        for (const r of rows) {
          const existing = this.rows.get(r.id);
          if (existing && r.updatedAt <= existing.updatedAt) continue;
          const clean = r.deletedAt ? { ...r, question: '', notes: '' } : r;
          this.rows.set(r.id, { ...clean, serverAt: this.stamp() });
        }
      },
    };
  }
}

export class FakeAuth implements SyncAuth {
  email: string | null = null;
  sentTo: string[] = [];
  deleted = false;
  constructor(private cloud: FakeCloud, public validCode = '123456') {}
  async currentEmail() {
    return this.email;
  }
  async sendCode(email: string) {
    if (this.cloud.offline) throw new Error('offline');
    this.sentTo.push(email);
  }
  async verifyCode(email: string, code: string) {
    if (code !== this.validCode) throw new Error('bad code');
    this.email = email;
    return email;
  }
  async signOut() {
    this.email = null;
  }
  async deleteAccount() {
    if (this.cloud.offline) throw new Error('offline');
    this.cloud.rows.clear();
    this.deleted = true;
    this.email = null;
  }
}

export function fakeServices(cloud = new FakeCloud()): SyncServices & { cloud: FakeCloud; auth: FakeAuth } {
  return { cloud, auth: new FakeAuth(cloud), backend: cloud.backend() };
}
