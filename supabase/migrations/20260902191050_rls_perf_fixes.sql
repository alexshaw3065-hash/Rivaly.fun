-- Wrapping auth.uid() as (select auth.uid()) lets Postgres evaluate it
-- once per query (an initplan) instead of once per row — standard
-- Supabase RLS performance guidance, confirmed via the performance advisor.

create index follows_following_id_idx on public.follows (following_id);

drop policy "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows for insert
  with check ((select auth.uid()) = follower_id);

drop policy "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows for delete
  using ((select auth.uid()) = follower_id);

drop policy "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  visibility = 'public'
  or creator_id = (select auth.uid())
  or exists (select 1 from public.entries e where e.room_id = rooms.id and e.user_id = (select auth.uid()))
);

drop policy "rooms_insert_self" on public.rooms;
create policy "rooms_insert_self" on public.rooms for insert
  with check ((select auth.uid()) = creator_id);

drop policy "entries_select" on public.entries;
create policy "entries_select" on public.entries for select using (
  user_id = (select auth.uid())
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.visibility = 'public')
  or exists (select 1 from public.rooms r where r.id = entries.room_id and r.creator_id = (select auth.uid()))
  or exists (select 1 from public.entries e2 where e2.room_id = entries.room_id and e2.user_id = (select auth.uid()))
);

drop policy "entries_insert_self" on public.entries;
create policy "entries_insert_self" on public.entries for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.rooms r
      where r.id = entries.room_id and r.status = 'open' and r.entry_amount_cents = entries.amount_cents
    )
  );
