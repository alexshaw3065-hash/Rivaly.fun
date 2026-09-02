create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  side         text not null check (side in ('yes','no')),
  amount_cents bigint not null check (amount_cents > 0),
  created_at   timestamptz not null default now(),
  is_winner    boolean,
  payout_cents bigint,
  unique (room_id, user_id)
);

create index entries_room_idx on public.entries (room_id);
create index entries_user_idx on public.entries (user_id);

alter table public.entries enable row level security;

-- Private-room entries are visible only to that room's creator and its
-- participants; public-room entries are visible to everyone.
create policy "entries_select" on public.entries for select using (
  user_id = auth.uid()
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.visibility = 'public')
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.creator_id = auth.uid())
  or exists (select 1 from public.entries e2 where e2.room_id = entries.room_id and e2.user_id = auth.uid())
);

-- Self-only inserts, only into an open room, only matching that room's
-- real entry amount (defense in depth alongside the app-level check in
-- the server action that will call this).
create policy "entries_insert_self" on public.entries for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.rooms r
      where r.id = entries.room_id and r.status = 'open' and r.entry_amount_cents = entries.amount_cents
    )
  );

create or replace function public.handle_new_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.rooms
  set pool_total_cents = pool_total_cents + new.amount_cents,
      yes_total_cents = yes_total_cents + case when new.side = 'yes' then new.amount_cents else 0 end,
      no_total_cents = no_total_cents + case when new.side = 'no' then new.amount_cents else 0 end,
      participant_count = participant_count + 1
  where id = new.room_id;
  return new;
end;
$$;

create trigger on_entry_created
  after insert on public.entries
  for each row execute function public.handle_new_entry();

-- Now that entries exists, widen rooms' select policy to include
-- participants (resolves the circular dependency from the rooms migration).
drop policy "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  visibility = 'public'
  or creator_id = auth.uid()
  or exists (select 1 from public.entries e where e.room_id = rooms.id and e.user_id = auth.uid())
);
