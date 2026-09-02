-- entries_select's last clause queried entries itself (aliased e2) from
-- within entries' own policy — a self-referential RLS cycle, confirmed via
-- the same 42P17 "infinite recursion" error, this time on relation
-- "entries" rather than "rooms". Same fix as rooms_select: route the
-- "am I a participant in this room" check through the existing
-- SECURITY DEFINER helper (room_has_participant, which bypasses RLS
-- internally) instead of a raw subquery on the protected table itself.
drop policy "entries_select" on public.entries;
create policy "entries_select" on public.entries for select using (
  user_id = (select auth.uid())
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.visibility = 'public')
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.creator_id = (select auth.uid()))
  or public.room_has_participant(entries.room_id, (select auth.uid()))
);
