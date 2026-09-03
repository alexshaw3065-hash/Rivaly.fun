-- Real chat, replacing the mock in-memory messages for real (UUID) rooms.
-- Uses the room_has_participant() SECURITY DEFINER helper (see
-- fix_rooms_entries_rls_recursion.sql) instead of a raw subquery against
-- entries, to avoid a third instance of the same RLS recursion bug that hit
-- rooms/entries.

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index messages_room_created_idx on public.messages (room_id, created_at);

alter table public.messages enable row level security;

create policy messages_select on public.messages
  for select
  using (
    exists (select 1 from public.rooms r where r.id = messages.room_id and r.visibility = 'public')
    or exists (select 1 from public.rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid()))
    or public.room_has_participant(room_id, (select auth.uid()))
  );

create policy messages_insert_self on public.messages
  for insert
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.rooms r where r.id = messages.room_id and r.visibility = 'public')
      or exists (select 1 from public.rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid()))
      or public.room_has_participant(room_id, (select auth.uid()))
    )
  );

-- Required for the client-side postgres_changes subscription in
-- chat-composer.tsx — new tables aren't added to this publication
-- automatically.
alter publication supabase_realtime add table public.messages;
