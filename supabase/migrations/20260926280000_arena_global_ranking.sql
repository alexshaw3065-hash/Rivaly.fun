-- Arena: the Global tab is ranked, not newest-first. Following stays a
-- time-ordered timeline, like X's two tabs.
--
-- arena_items() is everything the feed can show, with who/what each item is
-- about. arena_feed() pages it by time (Following, and one-match views);
-- arena_ranked() scores it for the viewer and pages that order.
--
-- The score, per item:
--   kind      a receipt or a goal outranks a plain entry
--   closeness a head-to-head rival > someone you follow > someone in your
--             rooms > a league-mate > a stranger; for moments and rooms,
--             a match you're in > a match your circle is in > any match
--   yours     anything happening in a room you've backed (someone fading
--             you, a rival joining, your room settling) counts double
--   buzz      reactions + 2×replies + takes + views, and fresh stakes on a
--             hot room — log-damped so one viral post can't own the feed
--   stakes    bigger pools rank a little higher
--   live      anything on a match being played right now × 1.5
--   seen      posts you've already scrolled past sink (× 0.35)
--   age       divided by (hours + 2)^1.5, so fast-rising beats old-popular
--   variety   each extra item from the same person (or the same match's
--             moments) is worth a bit less, so nobody floods the feed
--   shuffle   a ±15% per-session wobble: the same score order never
--             repeats exactly, and a refresh brings a new mix
--
-- Paging a ranked list: the client fixes a session (as-of time + seed) on
-- first load and pages by offset against it, so the order holds still while
-- you scroll. Anything newer waits behind the "N new" pill.

create or replace function public.arena_items(p_scope text default 'global', p_match uuid default null)
returns table(kind text, id uuid, at timestamptz, data jsonb, author_id uuid, room_id uuid, match_id text)
language sql stable security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  circle as (
    select uid as user_id from me where uid is not null
    union select f.following_id from follows f, me where f.follower_id = me.uid
  ),
  match_json as (
    select m.id, jsonb_build_object(
      'id', m.id, 'home', m.home_team, 'away', m.away_team, 'competition', m.competition,
      'sportId', m.sport_id, 'status', m.status, 'homeScore', m.home_score, 'awayScore', m.away_score,
      'kickoffAt', m.kickoff_at) as j
    from matches m
  ),
  room_json as (
    select r.id, r.match_id, jsonb_build_object(
      'id', r.id, 'prediction', r.prediction, 'status', r.status, 'visibility', r.visibility,
      'pool', r.pool_total_cents, 'yes', r.yes_total_cents, 'no', r.no_total_cents,
      'participants', r.participant_count, 'outcome', r.resolved_outcome, 'matchId', r.match_id,
      'settledAt', r.settled_at) as j
    from rooms r where r.visibility = 'public'
  ),
  author_json as (
    select p.id, jsonb_build_object('id', p.id, 'username', p.username, 'name', p.display_name, 'avatar', p.avatar_url) as j
    from profiles p
  ),
  reactions as (
    select ar.target_kind, ar.target_id,
      jsonb_object_agg(ar.emoji, ar.c) as counts
    from (select target_kind, target_id, emoji, count(*)::int as c from arena_reactions group by 1, 2, 3) ar
    group by 1, 2
  ),
  mine as (
    select target_kind, target_id, jsonb_agg(emoji) as emojis
    from arena_reactions, me where user_id = me.uid group by 1, 2
  ),
  posts_items as (
    select 'post'::text as kind, p.id, p.created_at as at, jsonb_build_object(
      'author', a.j, 'body', p.body, 'attachment', p.attachment, 'side', p.side,
      'match', mj.j, 'room', rj.j, 'momentId', p.moment_id, 'replies', p.reply_count, 'views', p.view_count,
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb)) as data,
      p.author_id, p.room_id, p.match_id::text as match_id
    from posts p
    join author_json a on a.id = p.author_id
    left join match_json mj on mj.id = p.match_id
    left join room_json rj on rj.id = p.room_id
    left join reactions rx on rx.target_kind = 'post' and rx.target_id = p.id
    left join mine mn on mn.target_kind = 'post' and mn.target_id = p.id
    where p.parent_id is null
      and (p_scope <> 'following' or p.author_id in (select user_id from circle))
      and (p_match is null or p.match_id = p_match)
  ),
  receipt_items as (
    select 'receipt'::text, p.id, r.settled_at, jsonb_build_object(
      'author', a.j, 'body', p.body, 'attachment', p.attachment, 'side', p.side, 'calledAt', p.created_at,
      'match', mj.j, 'room', rj.j, 'won', p.side = r.resolved_outcome, 'replies', p.reply_count, 'views', p.view_count,
      'rematchMatchId', (
        select m2.id from matches m2, matches m1
        where m1.id::text = r.match_id and m2.kickoff_at > now() and m2.status = 'scheduled'
          and (m2.home_team in (m1.home_team, m1.away_team) or m2.away_team in (m1.home_team, m1.away_team))
        order by m2.kickoff_at limit 1),
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb)),
      p.author_id, r.id, r.match_id
    from posts p
    join rooms r on r.id = p.room_id and r.status = 'settled' and r.resolved_outcome in ('yes', 'no') and r.settled_at is not null
    join author_json a on a.id = p.author_id
    join room_json rj on rj.id = r.id
    left join match_json mj on mj.id = p.match_id
    left join reactions rx on rx.target_kind = 'post' and rx.target_id = p.id
    left join mine mn on mn.target_kind = 'post' and mn.target_id = p.id
    where p.parent_id is null and p.side is not null
      and (p_scope <> 'following' or p.author_id in (select user_id from circle))
      and (p_match is null or p.match_id = p_match)
  ),
  entry_items as (
    select 'entry'::text, e.id, e.created_at, jsonb_build_object(
      'author', a.j, 'side', e.side, 'amount', e.amount_cents, 'room', rj.j,
      'match', (select mj.j from match_json mj where mj.id::text = r.match_id),
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb)),
      e.user_id, r.id, r.match_id
    from entries e
    join rooms r on r.id = e.room_id and r.visibility = 'public'
    join room_json rj on rj.id = r.id
    join author_json a on a.id = e.user_id
    left join reactions rx on rx.target_kind = 'entry' and rx.target_id = e.id
    left join mine mn on mn.target_kind = 'entry' and mn.target_id = e.id
    where (p_scope <> 'following' or e.user_id in (select user_id from circle))
      and (p_match is null or r.match_id = p_match::text)
      and not exists (select 1 from posts p where p.room_id = e.room_id and p.author_id = e.user_id and p.parent_id is null and p.side is not null)
  ),
  settled_items as (
    select 'settled'::text, r.id, r.settled_at, jsonb_build_object(
      'room', rj.j,
      'match', (select mj.j from match_json mj where mj.id::text = r.match_id),
      'winners', coalesce((
        select jsonb_agg(jsonb_build_object('author', a.j, 'payout', e.payout_cents, 'stake', e.amount_cents) order by e.payout_cents desc nulls last)
        from entries e join author_json a on a.id = e.user_id
        where e.room_id = r.id and e.is_winner), '[]'::jsonb)),
      null::uuid, r.id, r.match_id
    from rooms r
    join room_json rj on rj.id = r.id
    where r.status = 'settled' and r.settled_at is not null and r.resolved_outcome in ('yes', 'no')
      and (p_scope <> 'following' or exists (select 1 from entries e where e.room_id = r.id and e.user_id in (select user_id from circle)))
      and (p_match is null or r.match_id = p_match::text)
  ),
  hot_items as (
    select 'hot'::text, r.id, max(e.created_at), jsonb_build_object(
      'room', rj.j,
      'match', (select mj.j from match_json mj where mj.id::text = r.match_id),
      'recent', count(*)::int),
      null::uuid, r.id, r.match_id
    from rooms r
    join room_json rj on rj.id = r.id
    join entries e on e.room_id = r.id and e.created_at > now() - interval '30 minutes'
    where r.status = 'open'
      and (p_match is null or r.match_id = p_match::text)
    group by r.id, rj.j
    having count(*) >= 2
  ),
  moment_rows as (
    select * from public.arena_moments(p_match)
  ),
  moment_items as (
    select 'moment'::text, mr.id, mr.at, jsonb_build_object(
      'action', mr.action, 'minute', mr.minute,
      'payload', mr.payload,
      'match', mj.j,
      'rooms', (select count(*) from rooms r where r.match_id = mr.match_id::text and r.visibility = 'public' and r.status <> 'cancelled')::int,
      'takes', (select count(*) from posts p where p.moment_id = mr.id)::int,
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb)),
      null::uuid, null::uuid, mr.match_id::text
    from moment_rows mr
    join match_json mj on mj.id = mr.match_id
    left join reactions rx on rx.target_kind = 'moment' and rx.target_id = mr.id
    left join mine mn on mn.target_kind = 'moment' and mn.target_id = mr.id
    where p_scope <> 'following' or exists (
      select 1 from rooms r join entries e on e.room_id = r.id
      where r.match_id = mr.match_id::text and e.user_id in (select user_id from circle))
  )
  select * from posts_items
  union all select * from receipt_items
  union all select * from entry_items
  union all select * from settled_items
  union all select * from hot_items
  union all select * from moment_items;
$$;
-- Internal: the two feeds below call it as its owner.
revoke execute on function public.arena_items(text, uuid) from public, anon, authenticated;

-- The time-ordered feed (Following, and a single match's thread). Same
-- output and paging as before.
create or replace function public.arena_feed(
  p_scope text default 'global',
  p_match uuid default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns table(kind text, id uuid, at timestamptz, data jsonb)
language sql stable security definer
set search_path = public
as $$
  select i.kind, i.id, i.at, i.data
  from public.arena_items(p_scope, p_match) i
  -- A hot room is a "right now" item: only at the top, never deep in history.
  where (i.kind <> 'hot' or p_before is null)
    and (p_before is null or (i.at, i.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by i.at desc, i.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- The ranked Global feed.
create or replace function public.arena_ranked(
  p_as_of timestamptz default now(),
  p_seed integer default 0,
  p_offset integer default 0,
  p_limit integer default 20
)
returns table(kind text, id uuid, at timestamptz, data jsonb)
language sql stable security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  following as (select f.following_id as uid from follows f, me where f.follower_id = me.uid),
  my_rooms as (select e.room_id, e.side from entries e, me where e.user_id = me.uid),
  -- Anyone who's stood on the other side of a room from you.
  rivals as (
    select distinct e.user_id as uid from entries e join my_rooms mr on mr.room_id = e.room_id and e.side <> mr.side
  ),
  roommates as (select distinct e.user_id as uid from entries e join my_rooms mr on mr.room_id = e.room_id),
  league_mates as (
    select distinct b.user_id as uid from league_members a join league_members b on b.league_id = a.league_id, me where a.user_id = me.uid
  ),
  my_matches as (select distinct r.match_id from rooms r join my_rooms mr on mr.room_id = r.id),
  circle_matches as (select distinct r.match_id from rooms r join entries e on e.room_id = r.id join following f on f.uid = e.user_id),
  seen as (select pv.post_id from post_views pv, me where me.uid is not null and pv.viewer_key = 'u:' || me.uid::text),
  items as (
    select * from public.arena_items('global', null) i
    where i.at <= p_as_of and i.at > p_as_of - interval '30 days'
  ),
  scored as (
    select i.kind, i.id, i.at, i.data, i.author_id, i.match_id,
      (case i.kind when 'receipt' then 1.3 when 'moment' then 1.25 when 'hot' then 1.2 when 'settled' then 1.1 when 'post' then 1.0 else 0.6 end)
      * (case
          when i.author_id is not null and i.author_id = me.uid then 1.0
          when i.author_id in (select uid from rivals) then 1.4
          when i.author_id in (select uid from following) then 1.2
          when i.author_id in (select uid from roommates) then 1.0
          when i.author_id in (select uid from league_mates) then 0.85
          when i.author_id is not null then 0.55
          when i.match_id in (select match_id from my_matches) then 1.3
          when i.match_id in (select match_id from circle_matches) then 1.0
          else 0.7 end)
      * (case when i.room_id in (select room_id from my_rooms) and i.author_id is distinct from me.uid then 2.0 else 1.0 end)
      * (case when i.kind in ('post', 'receipt') and i.id in (select post_id from seen) then 0.35 else 1.0 end)
      * (case when i.data->'match'->>'status' = 'live' then 1.5 else 1.0 end)
      * (1 + 0.15 * ln(1 + coalesce((i.data->'room'->>'pool')::numeric, 0) / 100))
      * (1 + ln(1
          + coalesce((select sum(v::numeric) from jsonb_each_text(coalesce(i.data->'reactions', '{}'::jsonb)) as r(k, v)), 0)
          + 2 * coalesce((i.data->>'replies')::numeric, 0)
          + 1.5 * coalesce((i.data->>'takes')::numeric, 0)
          + 0.05 * coalesce((i.data->>'views')::numeric, 0)
          + 2 * coalesce((i.data->>'recent')::numeric, 0)))
      / power(greatest(extract(epoch from (p_as_of - i.at)) / 3600, 0) + 2, 1.5)
      * (0.85 + 0.3 * ((abs(hashtext(i.id::text || ':' || coalesce(p_seed, 0)::text)) % 1000) / 1000.0))
      as base
    from items i, me
  ),
  varied as (
    select s.*,
      s.base * power(0.55, row_number() over (
        partition by case when s.author_id is not null then 'a:' || s.author_id::text
                          when s.kind = 'moment' then 'm:' || coalesce(s.match_id, '')
                          else s.kind || ':' || s.id::text end
        order by s.base desc) - 1) as score
    from scored s
  )
  select v.kind, v.id, v.at, v.data
  from varied v
  order by v.score desc, v.id desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke execute on function public.arena_ranked(timestamptz, integer, integer, integer) from public;
grant execute on function public.arena_ranked(timestamptz, integer, integer, integer) to anon, authenticated;
