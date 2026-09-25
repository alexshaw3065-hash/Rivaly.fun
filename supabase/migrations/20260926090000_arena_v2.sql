-- Arena v2 (docs/plans/arena-redesign.md): everything real, nothing seeded.
--   1. posts grow up: 500 characters, a photo or GIF, a match tag, a moment
--      it answers, a call (a room + the side the author actually staked),
--      and one level of replies.
--   2. arena_reactions: one small football set of reactions on posts,
--      match moments and room entries (replaces the single 🔥 roast).
--   3. Leagues for real: points only, private, join by code.
--   4. arena_feed(): one query for the whole feed — posts, calls, entries,
--      receipts, settled rooms, rooms heating up and big match moments.
--   5. Leaderboard + league tables computed from settled rooms only.
--   6. The Arena's realtime channel (presence) for real "here now" counts.

-- ── 1. posts ────────────────────────────────────────────────────────────
drop trigger if exists on_post_roast_created on public.post_roasts;
drop trigger if exists on_post_roast_deleted on public.post_roasts;
drop table if exists public.post_roasts;
drop function if exists public.handle_post_roast_insert();
drop function if exists public.handle_post_roast_delete();
alter table public.posts drop column if exists roast_count;

alter table public.posts
  add column attachment jsonb,
  add column match_id uuid references public.matches(id) on delete set null,
  add column moment_id uuid references public.match_events(id) on delete set null,
  add column side text check (side in ('yes', 'no')),
  add column parent_id uuid references public.posts(id) on delete cascade,
  add column reply_count integer not null default 0;

alter table public.posts drop constraint posts_body_check;
alter table public.posts add constraint posts_body_check
  check (char_length(body) <= 500 and (char_length(body) >= 1 or attachment is not null));

-- Same rules as chat: a photo is only a Cloudinary ref, a GIF only a Klipy
-- media URL, the blurred preview only an inline image.
alter table public.posts add constraint posts_attachment_shape check (
  attachment is null or (
    jsonb_typeof(attachment) = 'object'
    and attachment->>'ref' ~ '^[A-Za-z0-9_./-]{1,200}$'
    and pg_column_size(attachment) <= 3072
    and (attachment->'lqip' is null or attachment->>'lqip' ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$')
    and (
      (attachment->>'type' = 'image' and attachment->'url' is null)
      or (attachment->>'type' = 'gif' and attachment->>'url' ~ '^https://static[0-9]?\.klipy\.com/[A-Za-z0-9_./-]{1,300}$')
    )
  )
);
alter table public.posts add constraint posts_call_needs_side check ((room_id is null) = (side is null));

create index if not exists posts_parent_idx on public.posts (parent_id, created_at) where parent_id is not null;
create index if not exists posts_feed_idx on public.posts (created_at desc, id desc) where parent_id is null;
create index if not exists posts_match_idx on public.posts (match_id) where match_id is not null;
create index if not exists posts_room_idx on public.posts (room_id) where room_id is not null;
create index if not exists posts_moment_idx on public.posts (moment_id) where moment_id is not null;
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);

-- A post's rules, checked where no client can skip them:
--   • a call is on a public room, on the side the author really staked
--     (so a receipt can never be faked), and inherits that room's match;
--   • a reply answers a top-level post and carries no call of its own;
--   • about ten posts and five photos a minute per person.
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
    select e.side into staked from entries e where e.room_id = new.room_id and e.user_id = new.author_id limit 1;
    if staked is null or staked <> new.side then
      raise exception 'call_needs_stake';
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

create trigger posts_before_insert
  before insert on public.posts
  for each row execute function public.posts_before_insert();

create or replace function public.posts_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update posts set reply_count = reply_count + 1 where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update posts set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
  end if;
  return null;
end;
$$;

create trigger posts_reply_count
  after insert or delete on public.posts
  for each row execute function public.posts_reply_count();

-- Authors can take their own posts down.
create policy posts_delete_self on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

revoke execute on function public.posts_before_insert() from anon, authenticated, public;
revoke execute on function public.posts_reply_count() from anon, authenticated, public;

alter table public.posts replica identity full;
alter publication supabase_realtime add table public.posts;

-- ── 2. reactions ────────────────────────────────────────────────────────
create table public.arena_reactions (
  target_kind text not null check (target_kind in ('post', 'moment', 'entry')),
  target_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '😂', '🎯', '🤡', '🧢')),
  created_at timestamptz not null default now(),
  primary key (target_kind, target_id, user_id, emoji)
);
create index if not exists arena_reactions_user_idx on public.arena_reactions (user_id);

alter table public.arena_reactions enable row level security;
create policy arena_reactions_select on public.arena_reactions for select to anon, authenticated using (true);
create policy arena_reactions_insert on public.arena_reactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy arena_reactions_delete on public.arena_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Only things the Arena actually shows can be reacted to.
create or replace function public.arena_reactions_target_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_kind = 'post' and not exists (select 1 from posts where id = new.target_id) then
    raise exception 'reaction_target_missing';
  elsif new.target_kind = 'moment' and not exists (
    select 1 from match_events where id = new.target_id
      and action in ('goal', 'penalty', 'red_card', 'var_end', 'game_finalised', 'touchdown', 'field_goal')
  ) then
    raise exception 'reaction_target_missing';
  elsif new.target_kind = 'entry' and not exists (
    select 1 from entries e join rooms r on r.id = e.room_id where e.id = new.target_id and r.visibility = 'public'
  ) then
    raise exception 'reaction_target_missing';
  end if;
  return new;
end;
$$;

create trigger arena_reactions_target_check
  before insert on public.arena_reactions
  for each row execute function public.arena_reactions_target_check();
revoke execute on function public.arena_reactions_target_check() from anon, authenticated, public;

-- ── 3. leagues (points only — no entry fee, no prize, ever) ────────────
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  creator_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index if not exists league_members_user_idx on public.league_members (user_id);

create or replace function public.is_league_member(p_league uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from league_members where league_id = p_league and user_id = (select auth.uid()));
$$;

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
-- Private: a league you're not in doesn't exist as far as you can tell.
create policy leagues_select_member on public.leagues for select to authenticated using (public.is_league_member(id));
create policy league_members_select on public.league_members for select to authenticated using (public.is_league_member(league_id));
create policy league_members_leave on public.league_members for delete to authenticated using (user_id = (select auth.uid()));

-- Leaving is one tap; the last one out closes the league.
create or replace function public.league_members_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from league_members where league_id = old.league_id) then
    delete from leagues where id = old.league_id;
  end if;
  return null;
end;
$$;
create trigger league_members_cleanup after delete on public.league_members
  for each row execute function public.league_members_cleanup();
revoke execute on function public.league_members_cleanup() from anon, authenticated, public;

create or replace function public.create_league(p_name text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  l leagues;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from league_members m where m.user_id = me) >= 20 then raise exception 'league_limit'; end if;
  insert into leagues (name, creator_id) values (btrim(p_name), me) returning * into l;
  insert into league_members (league_id, user_id) values (l.id, me);
  return query select l.id, l.name, l.code;
end;
$$;

create or replace function public.join_league(p_code text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  l leagues;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into l from leagues where leagues.code = upper(btrim(p_code));
  if not found then raise exception 'league_not_found'; end if;
  if (select count(*) from league_members m where m.league_id = l.id) >= 200 then raise exception 'league_full'; end if;
  if (select count(*) from league_members m where m.user_id = me) >= 20 then raise exception 'league_limit'; end if;
  insert into league_members (league_id, user_id) values (l.id, me) on conflict do nothing;
  return query select l.id, l.name, l.code;
end;
$$;

revoke execute on function public.create_league(text) from anon, public;
revoke execute on function public.join_league(text) from anon, public;
grant execute on function public.create_league(text) to authenticated;
grant execute on function public.join_league(text) to authenticated;

-- ── 5. points, tables, leaderboard ─────────────────────────────────────
-- A gameweek runs Tuesday to Monday (UTC), like a football week.
create or replace function public.gameweek_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select date_trunc('week', p_at - interval '1 day') + interval '1 day';
$$;

-- Every settled result, one row per entry. Points: a win is 3, and beating
-- the room (your side held under 40% of the pool) adds 1. Voids don't count.
create or replace function public.arena_results()
returns table (user_id uuid, room_id uuid, won boolean, points int, profit_cents bigint, at timestamptz, is_public boolean)
language sql
stable
security definer
set search_path = public
as $$
  select e.user_id, e.room_id, e.is_winner,
    case when e.is_winner then 3 + case
      when r.pool_total_cents > 0 and (case e.side when 'yes' then r.yes_total_cents else r.no_total_cents end)::numeric / r.pool_total_cents < 0.4 then 1
      else 0 end
    else 0 end,
    coalesce(e.payout_cents, 0) - e.amount_cents,
    coalesce(r.settled_at, r.resolved_at, r.created_at),
    r.visibility = 'public'
  from entries e join rooms r on r.id = e.room_id
  where r.status = 'settled' and e.is_winner is not null;
$$;
revoke execute on function public.arena_results() from anon, authenticated, public;

create or replace function public.league_table(p_league uuid default null)
returns table (user_id uuid, username text, display_name text, avatar_url text, points int, gameweek_points int, wins int, played int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- p_league null = the Global league (everyone with a settled result).
  if p_league is not null and not public.is_league_member(p_league) then
    raise exception 'not_a_member';
  end if;
  return query
  with members as (
    select m.user_id from league_members m where m.league_id = p_league
  ),
  res as (
    select r.* from public.arena_results() r
    where p_league is null or r.user_id in (select m.user_id from members m)
  ),
  agg as (
    select res.user_id,
      sum(res.points)::int as points,
      coalesce(sum(res.points) filter (where res.at >= public.gameweek_start()), 0)::int as gameweek_points,
      count(*) filter (where res.won)::int as wins,
      count(*)::int as played
    from res group by res.user_id
  ),
  everyone as (
    select m.user_id from members m
    union
    select agg.user_id from agg
  )
  select p.id, p.username, p.display_name, p.avatar_url,
    coalesce(a.points, 0), coalesce(a.gameweek_points, 0), coalesce(a.wins, 0), coalesce(a.played, 0)
  from everyone ev
  join profiles p on p.id = ev.user_id
  left join agg a on a.user_id = ev.user_id
  order by coalesce(a.points, 0) desc, coalesce(a.wins, 0) desc, p.display_name
  limit 200;
end;
$$;
grant execute on function public.league_table(uuid) to anon, authenticated;

-- The Leaderboard: public rooms only (same rule as Home's rival rows).
--   metric: profit | gameweek | accuracy | streak    scope: global | following
create or replace function public.arena_leaderboard(p_metric text default 'profit', p_scope text default 'global')
returns table (user_id uuid, username text, display_name text, avatar_url text, value numeric, played int)
language sql
stable
security definer
set search_path = public
as $$
  with res as (
    select r.* from public.arena_results() r
    where r.is_public
      and (p_scope <> 'following' or r.user_id = auth.uid()
        or r.user_id in (select f.following_id from follows f where f.follower_id = auth.uid()))
  ),
  ordered as (
    select res.*, sum(case when res.won then 0 else 1 end)
      over (partition by res.user_id order by res.at desc rows between unbounded preceding and current row) as losses_before
    from res
  ),
  agg as (
    select res.user_id,
      sum(res.profit_cents) as profit,
      coalesce(sum(res.points) filter (where res.at >= public.gameweek_start()), 0) as gw,
      count(*) filter (where res.won)::numeric / nullif(count(*), 0) as accuracy,
      count(*)::int as played
    from res group by res.user_id
  ),
  streaks as (
    select o.user_id, count(*) as streak from ordered o where o.losses_before = 0 group by o.user_id
  )
  select p.id, p.username, p.display_name, p.avatar_url,
    case p_metric
      when 'gameweek' then a.gw
      when 'accuracy' then round(a.accuracy * 100)
      when 'streak' then coalesce(s.streak, 0)
      else a.profit
    end as value,
    a.played
  from agg a
  join profiles p on p.id = a.user_id
  left join streaks s on s.user_id = a.user_id
  where case p_metric
      when 'accuracy' then a.played >= 3
      when 'gameweek' then a.gw > 0
      when 'streak' then coalesce(s.streak, 0) >= 2
      else true
    end
  order by value desc nulls last, a.played desc
  limit 50;
$$;
grant execute on function public.arena_leaderboard(text, text) to anon, authenticated;

-- Big match moments, one row per real event. The feed sends each event as
-- several records (amendments reuse its _eid; NFL sends the scoring record
-- and the player record separately, a few seconds apart), and a discarded
-- event (a goal VAR took away) must never show. So: group by _eid, keep the
-- latest known score/player/minute, drop discarded ones, then fold a
-- scoreless player record into its scored twin.
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
  )
  select g.id, g.match_id, g.action, g.minute, g.at,
    jsonb_strip_nulls(jsonb_build_object(
      'home', g.home, 'away', g.away, 'side', g.side, 'outcome', g.outcome,
      'playerId', coalesce(g.player, twin.player),
      'type', coalesce(g.kind, twin.kind)))
  from grouped g
  left join lateral (
    select t.player, t.kind from grouped t
    where t.match_id = g.match_id and t.action = g.action and t.home is null and t.eid <> g.eid
      and abs(extract(epoch from t.at - g.at)) < 180
    order by abs(extract(epoch from t.at - g.at))
    limit 1
  ) twin on true
  where (g.home is not null or g.action = 'penalty')
    and (g.action <> 'field_goal' or coalesce(g.outcome, 'successful') = 'successful');
$$;


-- ── 4. the feed ─────────────────────────────────────────────────────────
-- One list, newest first, paged by (at, id). Kinds:
--   post     a take or a call (top-level posts)
--   entry    someone backed a side in a public room
--   receipt  a call whose room has settled — it comes back with the result
--   settled  a public room settled (winners and the pot)
--   hot      a public room with 2+ new backers in the last 30 minutes (first page only)
--   moment   a goal, penalty, red card, VAR decision, full time, touchdown or field goal
-- scope 'following' keeps what you and the people you follow did, plus
-- moments from matches they're in. p_match narrows everything to one match.
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
    where p.parent_id is null
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
      and not exists (select 1 from posts p where p.room_id = e.room_id and p.author_id = e.user_id and p.parent_id is null)
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
grant execute on function public.arena_feed(text, uuid, timestamptz, uuid, int) to anon, authenticated;

-- ── 6. realtime: the Arena's presence channel ──────────────────────────
create policy rivaly_arena_channel_read on realtime.messages for select to anon, authenticated
  using (realtime.topic() = 'arena');
create policy rivaly_arena_channel_presence on realtime.messages for insert to anon, authenticated
  with check (realtime.topic() = 'arena' and extension = 'presence');

-- ── hardening (advisor pass) ───────────────────────────────────────────
alter function public.gameweek_start(timestamptz) set search_path = public;
-- arena_moments is only read through arena_feed; is_league_member only by RLS.
revoke execute on function public.arena_moments(uuid) from anon, authenticated, public;
revoke execute on function public.is_league_member(uuid) from anon, public;
