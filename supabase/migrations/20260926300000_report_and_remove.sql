-- Report-and-remove: the safety net for chat and the Arena (no paid image
-- moderation — docs/plans/chat-media.md).
--
--   · Anyone signed in can report a chat message or an Arena post (not their
--     own), with one reason.
--   · The moment you report something, it's gone for you.
--   · Once 3 different people have reported it, it's hidden for everyone.
--   · Every report is kept (content_reports), so hidden content can be
--     reviewed and restored by clearing hidden_at.
--   · Up to 30 reports an hour per person, so one account can't spray them.

alter table public.messages add column if not exists hidden_at timestamptz;
alter table public.posts add column if not exists hidden_at timestamptz;

create table if not exists public.content_reports (
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('message', 'post')),
  target_id uuid not null,
  reason text not null check (reason in ('abuse', 'hate', 'explicit', 'spam', 'other')),
  created_at timestamptz not null default now(),
  primary key (reporter_id, target_kind, target_id)
);
create index if not exists content_reports_target_idx on public.content_reports (target_kind, target_id);
create index if not exists content_reports_recent_idx on public.content_reports (reporter_id, created_at desc);

alter table public.content_reports enable row level security;
drop policy if exists content_reports_select_self on public.content_reports;
create policy content_reports_select_self on public.content_reports
  for select using (reporter_id = (select auth.uid()));
-- No insert/update/delete policies: reports go through report_content().

create or replace function public.report_content(p_kind text, p_id uuid, p_reason text)
returns boolean -- true when this report tipped it into hidden-for-everyone
language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  author uuid;
  n int;
  hidden boolean := false;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('message', 'post') then raise exception 'bad_kind'; end if;
  if p_reason not in ('abuse', 'hate', 'explicit', 'spam', 'other') then raise exception 'bad_reason'; end if;

  if p_kind = 'message' then
    select user_id into author from messages where id = p_id;
  else
    select author_id into author from posts where id = p_id;
  end if;
  if author is null then raise exception 'not_found'; end if;
  if author = me then raise exception 'own_content'; end if;

  if (select count(*) from content_reports where reporter_id = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'report_rate_limit';
  end if;

  insert into content_reports (reporter_id, target_kind, target_id, reason)
  values (me, p_kind, p_id, p_reason)
  on conflict do nothing;

  select count(*) into n from content_reports where target_kind = p_kind and target_id = p_id;
  if n >= 3 then
    if p_kind = 'message' then
      update messages set hidden_at = now() where id = p_id and hidden_at is null;
    else
      update posts set hidden_at = now() where id = p_id and hidden_at is null;
    end if;
    hidden := found;
  end if;
  return hidden;
end;
$$;
revoke execute on function public.report_content(text, uuid, text) from public, anon;
grant execute on function public.report_content(text, uuid, text) to authenticated;

-- Reading: hidden content and anything you've reported drop out.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  (
    (exists (select 1 from rooms r where r.id = messages.room_id and r.visibility = 'public' and r.allow_spectators))
    or (exists (select 1 from rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid())))
    or room_has_participant(room_id, (select auth.uid()))
  )
  and hidden_at is null
  and not exists (
    select 1 from content_reports cr
    where cr.reporter_id = (select auth.uid()) and cr.target_kind = 'message' and cr.target_id = messages.id
  )
);

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (
  hidden_at is null
  and not exists (
    select 1 from content_reports cr
    where cr.reporter_id = (select auth.uid()) and cr.target_kind = 'post' and cr.target_id = posts.id
  )
);

-- The Arena feed reads as its owner (bypassing the policies above), so it
-- applies the same two rules to posts and receipts itself.
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
      and p.hidden_at is null
      and not exists (select 1 from content_reports cr, me where cr.reporter_id = me.uid and cr.target_kind = 'post' and cr.target_id = p.id)
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

      and p.hidden_at is null
      and not exists (select 1 from content_reports cr, me where cr.reporter_id = me.uid and cr.target_kind = 'post' and cr.target_id = p.id)
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
