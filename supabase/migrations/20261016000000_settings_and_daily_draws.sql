-- Mingalar Tarot cloud backup, part 2: portable settings and the Card of the Day history.
-- Both tables are tiny (one settings row per user; ~50 bytes per revealed day), so they sit
-- comfortably in the free tier. Name and the private device seed are never stored here.

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- Device clock, milliseconds since 1970. Used for last-write-wins.
  updated_at bigint not null
);

alter table public.user_settings enable row level security;
drop policy if exists "own row: select" on public.user_settings;
drop policy if exists "own row: insert" on public.user_settings;
drop policy if exists "own row: update" on public.user_settings;
drop policy if exists "own row: delete" on public.user_settings;
create policy "own row: select" on public.user_settings for select using (user_id = auth.uid());
create policy "own row: insert" on public.user_settings for insert with check (user_id = auth.uid());
create policy "own row: update" on public.user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own row: delete" on public.user_settings for delete using (user_id = auth.uid());

-- A stale device (offline for a week) can't overwrite newer settings made elsewhere.
create or replace function public.user_settings_lww()
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
  return new;
end;
$$;

drop trigger if exists user_settings_lww on public.user_settings;
create trigger user_settings_lww
  before insert or update on public.user_settings
  for each row execute function public.user_settings_lww();

create table if not exists public.daily_draws (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date_key text not null check (date_key ~ '^\d{4}-\d{2}-\d{2}$'),
  card_id text not null,
  reversed boolean not null,
  revealed_at bigint not null,
  -- The journal entry saved from this draw (no foreign key: readings sync independently).
  reading_id uuid,
  primary key (user_id, date_key)
);

alter table public.daily_draws enable row level security;
drop policy if exists "own rows: select" on public.daily_draws;
drop policy if exists "own rows: insert" on public.daily_draws;
drop policy if exists "own rows: update" on public.daily_draws;
drop policy if exists "own rows: delete" on public.daily_draws;
create policy "own rows: select" on public.daily_draws for select using (user_id = auth.uid());
create policy "own rows: insert" on public.daily_draws for insert with check (user_id = auth.uid());
create policy "own rows: update" on public.daily_draws for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows: delete" on public.daily_draws for delete using (user_id = auth.uid());

-- The Card of the Day is drawn once: the first reveal wins, and only the journal link can change
-- afterwards (set it, never lose it to a device that has not linked yet).
create or replace function public.daily_draws_first_wins()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.card_id := old.card_id;
    new.reversed := old.reversed;
    new.revealed_at := old.revealed_at;
    new.reading_id := coalesce(new.reading_id, old.reading_id);
  end if;
  return new;
end;
$$;

drop trigger if exists daily_draws_first_wins on public.daily_draws;
create trigger daily_draws_first_wins
  before update on public.daily_draws
  for each row execute function public.daily_draws_first_wins();
