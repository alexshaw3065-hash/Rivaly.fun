-- Real notifications. Every one is written by a trigger on the thing that
-- happened, so none can be faked from a client, and nobody is ever told
-- about their own action.
--
--   joined      someone backed a side in a room you created
--   big_stake   a big stake landed in a room you're in ($50+, or a quarter
--               of the pot once the pot's worth talking about)
--   faded       someone posted a call against your side in your room
--   kickoff     your room just went live
--   won / lost / refunded   your room was decided
--   reply       someone replied to your post
--   mention     someone @-mentioned you in a post
--   follow      someone followed you
--   league_join someone joined a league you made
--
-- Engagement mechanisms (rivaly-engagement-psychology): #2 anticipation —
-- kickoff and big-stake pings arrive before the result, not only after;
-- #5 rivalry — every line names the person; #9 social proof — a real stake
-- by a real person, never an invented "people are joining" nudge.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('joined', 'big_stake', 'faded', 'kickoff', 'won', 'lost', 'refunded', 'reply', 'mention', 'follow', 'league_join')),
  actor_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (user_id = (select auth.uid()));
-- No insert/update/delete policies: triggers write them, mark_notifications_read() reads them.

alter publication supabase_realtime add table public.notifications;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;
revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- ── Stakes: joined + big_stake ─────────────────────────────────────────
create or replace function public.notify_on_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r rooms%rowtype;
  others bigint;
  big boolean;
  payload jsonb;
begin
  select * into r from rooms where id = new.room_id;
  if not found then return new; end if;
  select coalesce(sum(amount_cents), 0) into others from entries where room_id = new.room_id and id <> new.id;
  big := new.amount_cents >= 5000 or (others >= 2000 and new.amount_cents * 4 >= others + new.amount_cents);
  payload := jsonb_build_object('side', new.side, 'amount', new.amount_cents, 'prediction', r.prediction, 'pool', others + new.amount_cents);

  if r.creator_id <> new.user_id then
    insert into notifications (user_id, kind, actor_id, room_id, data)
    values (r.creator_id, case when big then 'big_stake' else 'joined' end, new.user_id, r.id, payload);
  end if;

  if big then
    insert into notifications (user_id, kind, actor_id, room_id, data)
    select distinct e.user_id, 'big_stake', new.user_id, r.id, payload
    from entries e
    where e.room_id = r.id and e.user_id <> new.user_id and e.user_id <> r.creator_id;
  end if;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_entry failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists entries_notify on public.entries;
create trigger entries_notify after insert on public.entries for each row execute function public.notify_on_entry();

-- ── Results: won / lost / refunded (once, when the payout is first set) ─
create or replace function public.notify_on_result()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.payout_cents is not null or new.payout_cents is null then return new; end if;
  insert into notifications (user_id, kind, room_id, data)
  select new.user_id,
    case when new.is_winner is true then 'won' when new.is_winner is false then 'lost' else 'refunded' end,
    new.room_id,
    jsonb_build_object('side', new.side, 'amount', new.amount_cents, 'payout', new.payout_cents, 'prediction', r.prediction, 'outcome', r.resolved_outcome)
  from rooms r where r.id = new.room_id;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_result failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists entries_notify_result on public.entries;
create trigger entries_notify_result after update of payout_cents on public.entries for each row execute function public.notify_on_result();

-- ── Kickoff: the room went live ────────────────────────────────────────
create or replace function public.notify_on_kickoff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'open' and new.status = 'live' then
    insert into notifications (user_id, kind, room_id, data)
    select distinct e.user_id, 'kickoff', new.id, jsonb_build_object('prediction', new.prediction, 'side', e.side, 'pool', new.pool_total_cents)
    from entries e where e.room_id = new.id;
  end if;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_kickoff failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists rooms_notify_kickoff on public.rooms;
create trigger rooms_notify_kickoff after update of status on public.rooms for each row execute function public.notify_on_kickoff();

-- ── Posts: reply, mention, faded ───────────────────────────────────────
create or replace function public.notify_on_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_author uuid;
  snippet text := left(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), 120);
  r rooms%rowtype;
begin
  if new.parent_id is not null then
    select author_id into parent_author from posts where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into notifications (user_id, kind, actor_id, post_id, data)
      values (parent_author, 'reply', new.author_id, new.id, jsonb_build_object('body', snippet, 'parentId', new.parent_id));
    end if;
  end if;

  -- @mentions (at most 5 people per post, never the author or the person already told about a reply).
  insert into notifications (user_id, kind, actor_id, post_id, data)
  select p.id, 'mention', new.author_id, new.id, jsonb_build_object('body', snippet, 'parentId', new.parent_id)
  from (
    select distinct lower(m[1]) as handle
    from regexp_matches(coalesce(new.body, ''), '@([A-Za-z0-9_]{2,30})', 'g') as m
    limit 5
  ) h
  join profiles p on lower(p.username) = h.handle
  where p.id <> new.author_id and p.id is distinct from parent_author;

  -- A call on a room tells the other side (small rooms: everyone on it; big
  -- rooms: just the people who made calls of their own there).
  if new.parent_id is null and new.room_id is not null and new.side is not null then
    select * into r from rooms where id = new.room_id;
    if found then
      insert into notifications (user_id, kind, actor_id, room_id, post_id, data)
      select distinct t.uid, 'faded', new.author_id, r.id, new.id,
        jsonb_build_object('body', snippet, 'side', new.side, 'prediction', r.prediction)
      from (
        select e.user_id as uid from entries e
        where e.room_id = r.id and e.side <> new.side and r.participant_count <= 50
        union
        select c.author_id from posts c
        where c.room_id = r.id and c.parent_id is null and c.side is not null and c.side <> new.side
      ) t
      where t.uid <> new.author_id;
    end if;
  end if;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_post failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists posts_notify on public.posts;
create trigger posts_notify after insert on public.posts for each row execute function public.notify_on_post();

-- ── Follows and leagues ────────────────────────────────────────────────
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.following_id <> new.follower_id then
    -- One ping per follower per day, however often they unfollow and refollow.
    if not exists (
      select 1 from notifications
      where user_id = new.following_id and kind = 'follow' and actor_id = new.follower_id and created_at > now() - interval '1 day'
    ) then
      insert into notifications (user_id, kind, actor_id) values (new.following_id, 'follow', new.follower_id);
    end if;
  end if;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_follow failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows for each row execute function public.notify_on_follow();

create or replace function public.notify_on_league_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, actor_id, data)
  select l.creator_id, 'league_join', new.user_id, jsonb_build_object('league', l.name, 'leagueId', l.id)
  from leagues l where l.id = new.league_id and l.creator_id <> new.user_id;
  return new;
exception when others then
  -- A notification must never block the write it's about (a stake, a payout).
  raise warning 'notify_on_league_join failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists league_members_notify on public.league_members;
create trigger league_members_notify after insert on public.league_members for each row execute function public.notify_on_league_join();

-- Trigger functions aren't for calling directly.
revoke execute on function public.notify_on_entry(), public.notify_on_result(), public.notify_on_kickoff(),
  public.notify_on_post(), public.notify_on_follow(), public.notify_on_league_join() from public, anon, authenticated;
