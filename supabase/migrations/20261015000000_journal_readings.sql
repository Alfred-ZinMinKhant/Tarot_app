-- Mingalar Tarot cloud backup (optional). Apply with `supabase db push` or paste into the SQL editor.
-- Each row mirrors one journal reading on a device. Deletes are tombstones (deleted_at set) so they
-- reach the user's other devices.

create table if not exists public.journal_readings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('spread', 'daily')),
  spread_id text not null,
  topic text not null,
  question text not null default '',
  notes text not null default '',
  cards jsonb not null default '[]'::jsonb,
  date_key text not null,
  -- Device clock, milliseconds since 1970. Used for last-write-wins.
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  -- Server clock; the order in which devices pull changes.
  server_updated_at timestamptz not null default clock_timestamp()
);

create index if not exists journal_readings_feed on public.journal_readings (user_id, server_updated_at, id);

alter table public.journal_readings enable row level security;

drop policy if exists "own rows: select" on public.journal_readings;
drop policy if exists "own rows: insert" on public.journal_readings;
drop policy if exists "own rows: update" on public.journal_readings;
drop policy if exists "own rows: delete" on public.journal_readings;
create policy "own rows: select" on public.journal_readings for select using (user_id = auth.uid());
create policy "own rows: insert" on public.journal_readings for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.journal_readings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows: delete" on public.journal_readings for delete using (user_id = auth.uid());

-- Last write wins on the server too: an upload older than (or as old as) the stored row is ignored,
-- so a device that was offline for a week can't overwrite newer edits made elsewhere.
create or replace function public.journal_readings_lww()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at <= old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
  end if;
  if new.deleted_at is not null then
    new.question := '';
    new.notes := '';
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists journal_readings_lww on public.journal_readings;
create trigger journal_readings_lww
  before insert or update on public.journal_readings
  for each row execute function public.journal_readings_lww();
