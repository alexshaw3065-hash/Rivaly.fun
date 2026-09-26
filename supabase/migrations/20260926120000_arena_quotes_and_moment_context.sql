-- Arena v3:
--   1. Quote any public room in a post (room, no side). A call is still a
--      room plus the side you actually staked — and only calls get receipts.
--   2. Moments carry the score just before them (prevHome/prevAway), so the
--      app can show which rooms a goal just decided, using the same rules
--      that settle rooms (src/lib/settlement/resolve.ts).

alter table public.posts drop constraint posts_call_needs_side;
alter table public.posts add constraint posts_side_needs_room check (side is null or room_id is not null);

create or replace function public.posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  staked text;
  room_match text;
begin
  if (select count(*) from posts p where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'post_rate_limit';
  end if;
  if new.attachment->>'type' = 'image' and (
    select count(*) from posts p
    where p.author_id = new.author_id and p.attachment->>'type' = 'image' and p.created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'photo_rate_limit';
  end if;

  if new.parent_id is not null then
    if new.room_id is not null or new.moment_id is not null then
      raise exception 'reply_cannot_call';
    end if;
    if exists (select 1 from posts p where p.id = new.parent_id and p.parent_id is not null) then
      raise exception 'reply_depth';
    end if;
    select p.match_id into new.match_id from posts p where p.id = new.parent_id;
  end if;

  if new.room_id is not null then
    select r.match_id into room_match from rooms r where r.id = new.room_id and r.visibility = 'public';
    if not found then
      raise exception 'call_room_not_public';
    end if;
    -- A call (a side) must be the side the author really staked.
    if new.side is not null then
      select e.side into staked from entries e where e.room_id = new.room_id and e.user_id = new.author_id limit 1;
      if staked is null or staked <> new.side then
        raise exception 'call_needs_stake';
      end if;
    end if;
    if room_match ~ '^[0-9a-f-]{36}$' then
      new.match_id := room_match::uuid;
    end if;
  end if;

  if new.moment_id is not null then
    select me.match_id into new.match_id from match_events me where me.id = new.moment_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.posts_before_insert() from anon, authenticated, public;

create or replace function public.arena_moments(p_match uuid default null)
returns table (id uuid, match_id uuid, action text, minute int, at timestamptz, payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with raw as (
    select me.*, coalesce(me.payload->>'_eid', me.id::text) as eid
    from match_events me
    where me.action in ('goal', 'penalty', 'red_card', 'var_end', 'game_finalised', 'touchdown', 'field_goal')
      and (p_match is null or me.match_id = p_match)
      and not exists (
        select 1 from match_events d
        where d.match_id = me.match_id and d.action = 'action_discarded' and d.payload->>'_eid' = me.payload->>'_eid')
  ),
  grouped as (
    select r.match_id, r.action, r.eid,
      (array_agg(r.id order by r.provider_seq))[1] as id,
      min(coalesce(r.occurred_at, r.created_at)) as at,
      (array_agg(r.minute order by r.provider_seq desc) filter (where r.minute is not null))[1] as minute,
      (array_agg(r.payload->'_home' order by r.provider_seq desc) filter (where r.payload ? '_home'))[1] as home,
      (array_agg(r.payload->'_away' order by r.provider_seq desc) filter (where r.payload ? '_away'))[1] as away,
      (array_agg(r.payload->'_side' order by r.provider_seq desc) filter (where r.payload ? '_side'))[1] as side,
      (array_agg(r.payload->'PlayerId' order by r.provider_seq desc) filter (where r.payload ? 'PlayerId'))[1] as player,
      (array_agg(r.payload->>'Outcome' order by r.provider_seq desc) filter (where r.payload ? 'Outcome'))[1] as outcome,
      (array_agg(coalesce(r.payload->'Type', r.payload->'GoalType') order by r.provider_seq desc)
        filter (where r.payload ? 'Type' or r.payload ? 'GoalType'))[1] as kind
    from raw r
    group by r.match_id, r.action, r.eid
  ),
  kept as (
    select g.*, twin.player as twin_player, twin.kind as twin_kind
    from grouped g
    left join lateral (
      select t.player, t.kind from grouped t
      where t.match_id = g.match_id and t.action = g.action and t.home is null and t.eid <> g.eid
        and abs(extract(epoch from t.at - g.at)) < 180
      order by abs(extract(epoch from t.at - g.at))
      limit 1
    ) twin on true
    where (g.home is not null or g.action = 'penalty')
      and (g.action <> 'field_goal' or coalesce(g.outcome, 'successful') = 'successful')
  ),
  scored as (
    select k.id,
      lag(k.home) over w as prev_home,
      lag(k.away) over w as prev_away
    from kept k
    where k.home is not null and k.action in ('goal', 'touchdown', 'field_goal')
    window w as (partition by k.match_id order by k.at)
  )
  select k.id, k.match_id, k.action, k.minute, k.at,
    jsonb_strip_nulls(jsonb_build_object(
      'home', k.home, 'away', k.away, 'side', k.side, 'outcome', k.outcome,
      'playerId', coalesce(k.player, k.twin_player),
      'type', coalesce(k.kind, k.twin_kind),
      'prevHome', case when s.id is not null then coalesce(s.prev_home, '0'::jsonb) end,
      'prevAway', case when s.id is not null then coalesce(s.prev_away, '0'::jsonb) end))
  from kept k
  left join scored s on s.id = k.id;
$$;
revoke execute on function public.arena_moments(uuid) from anon, authenticated, public;

-- Receipts only for calls; an entry is folded into a call, never into a quote.
create or replace function public.arena_feed(
  p_scope text default 'global',
  p_match uuid default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 20
)
returns table (kind text, id uuid, at timestamptz, data jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  circle as (
    select uid as user_id from me where uid is not null
    union select f.following_id from follows f, me where f.follower_id = me.uid
  ),
  lim as (select least(greatest(coalesce(p_limit, 20), 1), 50) as n),
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
      'match', mj.j, 'room', rj.j, 'momentId', p.moment_id, 'replies', p.reply_count,
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb)) as data
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
      'match', mj.j, 'room', rj.j, 'won', p.side = r.resolved_outcome,
      'rematchMatchId', (
        select m2.id from matches m2, matches m1
        where m1.id::text = r.match_id and m2.kickoff_at > now() and m2.status = 'scheduled'
          and (m2.home_team in (m1.home_team, m1.away_team) or m2.away_team in (m1.home_team, m1.away_team))
        order by m2.kickoff_at limit 1),
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb))
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
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb))
    from entries e
    join rooms r on r.id = e.room_id and r.visibility = 'public'
    join room_json rj on rj.id = r.id
    join author_json a on a.id = e.user_id
    left join reactions rx on rx.target_kind = 'entry' and rx.target_id = e.id
    left join mine mn on mn.target_kind = 'entry' and mn.target_id = e.id
    where (p_scope <> 'following' or e.user_id in (select user_id from circle))
      and (p_match is null or r.match_id = p_match::text)
      -- the entry that a call was posted about already shows as the call
      and not exists (select 1 from posts p where p.room_id = e.room_id and p.author_id = e.user_id and p.parent_id is null and p.side is not null)
  ),
  settled_items as (
    select 'settled'::text, r.id, r.settled_at, jsonb_build_object(
      'room', rj.j,
      'match', (select mj.j from match_json mj where mj.id::text = r.match_id),
      'winners', coalesce((
        select jsonb_agg(jsonb_build_object('author', a.j, 'payout', e.payout_cents, 'stake', e.amount_cents) order by e.payout_cents desc nulls last)
        from entries e join author_json a on a.id = e.user_id
        where e.room_id = r.id and e.is_winner), '[]'::jsonb))
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
      'recent', count(*)::int)
    from rooms r
    join room_json rj on rj.id = r.id
    join entries e on e.room_id = r.id and e.created_at > now() - interval '30 minutes'
    where r.status = 'open' and p_before is null
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
      'reactions', coalesce(rx.counts, '{}'::jsonb), 'mine', coalesce(mn.emojis, '[]'::jsonb))
    from moment_rows mr
    join match_json mj on mj.id = mr.match_id
    left join reactions rx on rx.target_kind = 'moment' and rx.target_id = mr.id
    left join mine mn on mn.target_kind = 'moment' and mn.target_id = mr.id
    where p_scope <> 'following' or exists (
      select 1 from rooms r join entries e on e.room_id = r.id
      where r.match_id = mr.match_id::text and e.user_id in (select user_id from circle))
  ),
  everything as (
    select * from posts_items
    union all select * from receipt_items
    union all select * from entry_items
    union all select * from settled_items
    union all select * from hot_items
    union all select * from moment_items
  )
  select e.kind, e.id, e.at, e.data from everything e
  where p_before is null or (e.at, e.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
  order by e.at desc, e.id desc
  limit (select n from lim);
$$;
