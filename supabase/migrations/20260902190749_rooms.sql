-- match_id is a loose text reference into mock-data.ts's matches array
-- (real fixture data is out of scope for this slice) — no FK. The only
-- room-creation entry point restricts selection to the known mock match
-- ids, so this is safe until real fixtures ship, at which point a future
-- migration adds a real matches table + backfills + adds the FK.
create table public.rooms (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references public.profiles(id) on delete cascade,
  match_id           text not null,
  prediction         text not null check (char_length(prediction) between 1 and 280),
  entry_amount_cents bigint not null check (entry_amount_cents > 0),
  visibility         text not null default 'public' check (visibility in ('public','private')),
  status             text not null default 'open' check (status in ('open','live','settled','cancelled','refunded')),
  pool_total_cents   bigint not null default 0,
  yes_total_cents    bigint not null default 0,
  no_total_cents     bigint not null default 0,
  participant_count  integer not null default 0,
  resolution_source  text not null default 'Official match result',
  invite_code        text not null unique,
  created_at         timestamptz not null default now(),
  settled_at         timestamptz
);

create index rooms_status_visibility_idx on public.rooms (visibility, status);
create index rooms_creator_idx on public.rooms (creator_id);

alter table public.rooms enable row level security;

-- Placeholder select policy (public-or-creator only) — widened to include
-- room participants once the entries table exists (next migration), since
-- that policy needs to subquery entries and entries.room_id needs rooms
-- to exist first. Circular dependency, resolved in two steps.
create policy "rooms_select" on public.rooms for select using (
  visibility = 'public' or creator_id = auth.uid()
);

create policy "rooms_insert_self" on public.rooms for insert
  with check (auth.uid() = creator_id);

create or replace function public.handle_new_room()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set rooms_created_count = rooms_created_count + 1 where id = new.creator_id;
  return new;
end;
$$;

create trigger on_room_created
  after insert on public.rooms
  for each row execute function public.handle_new_room();
