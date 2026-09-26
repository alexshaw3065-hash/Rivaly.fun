-- Views on Arena posts, X-style. A view is counted once per person per post:
-- signed in, by your account; signed out, by a one-way hash of your network
-- address salted with the post id (so it can't be linked across posts or
-- reversed). No client-supplied ids, so a script can't pump the count by
-- inventing viewers. Authors viewing their own posts don't count.

alter table public.posts add column view_count integer not null default 0;

create table public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_key text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, viewer_key)
);
alter table public.post_views enable row level security;
-- No policies: only record_post_views() (security definer) touches it.

create or replace function public.record_post_views(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  ip text;
  pid uuid;
  key text;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return; end if;
  if me is null then
    begin
      ip := split_part(coalesce(
        current_setting('request.headers', true)::json->>'cf-connecting-ip',
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'x-real-ip', ''), ',', 1);
    exception when others then ip := '';
    end;
    if coalesce(btrim(ip), '') = '' then return; end if;
  end if;
  foreach pid in array p_ids[1:50] loop
    key := case when me is not null then 'u:' || me::text else 'a:' || md5(btrim(ip) || ':' || pid::text) end;
    insert into post_views (post_id, viewer_key)
    select pid, key
    from posts p
    where p.id = pid and (me is null or p.author_id <> me)
    on conflict do nothing;
    if found then
      update posts set view_count = view_count + 1 where id = pid;
    end if;
  end loop;
end;
$$;
revoke execute on function public.record_post_views(uuid[]) from public;
grant execute on function public.record_post_views(uuid[]) to anon, authenticated;

-- The feed carries each post's view and reply counts.
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
      'match', mj.j, 'room', rj.j, 'momentId', p.moment_id, 'replies', p.reply_count, 'views', p.view_count,
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
      'match', mj.j, 'room', rj.j, 'won', p.side = r.resolved_outcome, 'replies', p.reply_count, 'views', p.view_count,
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
