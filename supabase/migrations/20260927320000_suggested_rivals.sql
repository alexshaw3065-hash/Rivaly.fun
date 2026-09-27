-- Rivals to follow, for the strip at the top of the Arena feed. Picked from
-- real connections, strongest first — never random, never paid placement:
--   1. took the other side of one of your calls   ("Took you on")
--   2. was in a room with you                      ("In your rooms")
--   3. backed a match you backed, in another room  ("Backing your matches")
--   4. otherwise the best callers on Rivaly        ("Top caller")
-- Excludes you, people you already follow, banned accounts and placeholders.
-- Signed out, it's just the top callers. Engagement mechanism #5 (named
-- rivalry) and #9 (social proof from people like you).
create or replace function public.suggested_rivals(p_limit int default 12)
returns table(id uuid, username text, display_name text, avatar_url text, reason text, follower_count int)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  my_entries as (
    select e.room_id, e.side, r.match_id from entries e join rooms r on r.id = e.room_id, me where e.user_id = me.uid
  ),
  candidates as (
    select e.user_id, 1 as rank from entries e join my_entries m on m.room_id = e.room_id and e.side <> m.side
    union all
    select e.user_id, 2 from entries e join my_entries m on m.room_id = e.room_id and e.side = m.side
    union all
    select e.user_id, 3 from entries e join rooms r on r.id = e.room_id join my_entries m on m.match_id = r.match_id and m.room_id <> e.room_id
    union all
    select p.id, 4 from profiles p
  ),
  best as (
    select c.user_id, min(c.rank) as rank from candidates c group by c.user_id
  )
  select p.id, p.username, p.display_name, p.avatar_url,
    case b.rank when 1 then 'Took you on' when 2 then 'In your rooms' when 3 then 'Backing your matches' else 'Top caller' end,
    p.follower_count
  from best b
  join profiles p on p.id = b.user_id
  cross join me
  where p.id is distinct from me.uid
    and not p.username_is_placeholder
    and p.banned_at is null
    and not exists (select 1 from follows f where f.follower_id = me.uid and f.following_id = p.id)
  order by b.rank, p.total_winnings_cents desc nulls last, p.follower_count desc, p.created_at desc
  limit least(greatest(p_limit, 1), 30);
$$;
grant execute on function public.suggested_rivals(int) to anon, authenticated;

-- App-wide presence ("online now"): a private realtime channel everyone
-- signed in joins with their public profile basics. Reading is open (the
-- strip shows signed-out visitors who's around); tracking yourself needs an
-- account.
drop policy if exists rivaly_online_channel_read on realtime.messages;
create policy rivaly_online_channel_read on realtime.messages for select to anon, authenticated
  using (realtime.topic() = 'online');
drop policy if exists rivaly_online_channel_presence on realtime.messages;
create policy rivaly_online_channel_presence on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'online' and extension = 'presence');
