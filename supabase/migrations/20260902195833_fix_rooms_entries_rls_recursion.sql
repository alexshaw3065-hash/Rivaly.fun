-- rooms_select referenced entries directly, and entries' own policies
-- reference rooms back — a genuine circular RLS dependency (confirmed via
-- Postgres error 42P17 "infinite recursion detected in policy for
-- relation rooms" on the very first real room insert). A SECURITY
-- DEFINER helper breaks the cycle: it bypasses RLS internally when
-- checking entries, so rooms_select no longer triggers entries_select's
-- policy (which is the side of the cycle that was recursing back).
create or replace function public.room_has_participant(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.entries where room_id = p_room_id and user_id = p_user_id);
$$;

revoke execute on function public.room_has_participant(uuid, uuid) from public;
grant execute on function public.room_has_participant(uuid, uuid) to anon, authenticated;

drop policy "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  visibility = 'public'
  or creator_id = (select auth.uid())
  or public.room_has_participant(id, (select auth.uid()))
);
