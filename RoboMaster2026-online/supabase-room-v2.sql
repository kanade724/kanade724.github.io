-- RoboMaster 2026 online manual sync v2
-- Goal: upload only changed fields instead of full state blob

create table if not exists public.rm_rooms_v2 (
  room_id text primary key check (room_id ~ '^[a-zA-Z0-9_-]{3,64}$'),
  board jsonb not null default '{}'::jsonb,
  timeline_seconds integer not null default 0,
  units jsonb not null default '[]'::jsonb,
  modes jsonb not null default '[]'::jsonb,
  selected_mode_id text,
  mode_draft_name text not null default '',
  sync_password text not null default '123',
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rm_rooms_v2
  add column if not exists sync_password text not null default '123';

create or replace function public.rm_rooms_v2_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists trg_rm_rooms_v2_touch on public.rm_rooms_v2;
create trigger trg_rm_rooms_v2_touch
before update on public.rm_rooms_v2
for each row execute function public.rm_rooms_v2_touch();

alter table public.rm_rooms_v2 enable row level security;

drop policy if exists "rm_rooms_v2_select" on public.rm_rooms_v2;
create policy "rm_rooms_v2_select"
on public.rm_rooms_v2
for select
to anon
using (true);

drop policy if exists "rm_rooms_v2_insert" on public.rm_rooms_v2;
create policy "rm_rooms_v2_insert"
on public.rm_rooms_v2
for insert
to anon
with check (true);

drop policy if exists "rm_rooms_v2_update" on public.rm_rooms_v2;
create policy "rm_rooms_v2_update"
on public.rm_rooms_v2
for update
to anon
using (true)
with check (true);
