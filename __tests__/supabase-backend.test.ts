import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBackend, TABLE } from '@/sync/supabase';

/** Records the PostgREST query the backend builds and returns canned rows. */
function fakeClient(rows: unknown[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'or']) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
  builder.upsert = async (...args: unknown[]) => {
    calls.push({ method: 'upsert', args });
    return { error: null };
  };
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const row = {
  id: 'r1',
  kind: 'spread',
  spread_id: 'one-card',
  topic: 'love',
  question: 'ဘာဖြစ်မလဲ',
  notes: '',
  cards: [{ positionId: 'focus', cardId: 'major-00-fool', reversed: true }],
  date_key: '2026-10-15',
  created_at: '1760500000000',
  updated_at: '1760500000500',
  deleted_at: null,
  server_updated_at: '2026-10-15T06:14:00.123456+00:00',
};

describe('Supabase backend', () => {
  it('pulls the change feed after a quoted (time, id) cursor and maps rows', async () => {
    const { client, calls } = fakeClient([row]);
    const backend = createSupabaseBackend(client);
    const page = await backend.pull({ at: '2026-10-15T06:00:00+00:00', id: 'abc' }, 500);
    expect(calls[0]).toEqual({ method: 'from', args: [TABLE] });
    expect(calls.find((c) => c.method === 'or')!.args[0]).toBe(
      'server_updated_at.gt."2026-10-15T06:00:00+00:00",and(server_updated_at.eq."2026-10-15T06:00:00+00:00",id.gt.abc)',
    );
    expect(calls.find((c) => c.method === 'limit')!.args[0]).toBe(500);
    expect(page.rows[0]).toEqual({
      id: 'r1',
      kind: 'spread',
      spreadId: 'one-card',
      topic: 'love',
      question: 'ဘာဖြစ်မလဲ',
      notes: '',
      cards: [{ positionId: 'focus', cardId: 'major-00-fool', reversed: true }],
      dateKey: '2026-10-15',
      createdAt: 1760500000000,
      updatedAt: 1760500000500,
      deletedAt: null,
    });
    expect(page.cursor).toEqual({ at: row.server_updated_at, id: 'r1' });
  });

  it('starts from the beginning without a cursor and upserts by id', async () => {
    const { client, calls } = fakeClient([]);
    const backend = createSupabaseBackend(client);
    expect(await backend.pull(null, 10)).toEqual({ rows: [], cursor: null });
    expect(calls.some((c) => c.method === 'or')).toBe(false);
    await backend.push([
      {
        id: 'x',
        kind: 'daily',
        spreadId: 'daily',
        topic: 'general',
        question: '',
        notes: '',
        cards: [],
        dateKey: '2026-10-15',
        createdAt: 1,
        updatedAt: 2,
        deletedAt: 3,
      },
    ]);
    const upsert = calls.find((c) => c.method === 'upsert')!;
    expect(upsert.args[1]).toEqual({ onConflict: 'id' });
    expect((upsert.args[0] as { deleted_at: number; spread_id: string }[])[0]).toMatchObject({ deleted_at: 3, spread_id: 'daily' });
  });
});
