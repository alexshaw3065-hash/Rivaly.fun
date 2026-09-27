-- Admin, analytics and operations — the foundation.
--
--   admins            who can open /admin, with a role (owner/admin/moderator)
--   platform_events   one structured row per thing that happened (signup,
--                     stake, result, payout, report, admin action, job
--                     failure…) — the live stream, user timelines, room
--                     audit history and funnels all read this. Written by
--                     triggers on the tables that already record the facts,
--                     so nothing depends on a client remembering to log.
--   admin_audit       every admin action: who, what, why, before/after
--   moderation        suspensions/bans on profiles, admin notes, manual
--                     flags, report resolutions
--   feature_flags     real switches the app enforces (pause stakes, room
--                     creation, Arena posting, chat)
--   user_activity_days  one row per user per day they used the app — DAU,
--                     WAU, MAU, retention
--   job_runs          every cron/worker job run and whether it worked
--
-- Everything here is read by /admin through the service role after a
-- server-side admin check, and is closed to everyone else by RLS.

-- ── Admins ───────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'moderator')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.admin_role(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from admins where user_id = p_user;
$$;
create or replace function public.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = p_user);
$$;
revoke execute on function public.admin_role(uuid) from public, anon;
grant execute on function public.admin_role(uuid), public.is_admin(uuid) to authenticated;

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin((select auth.uid())));

-- ── Structured events ────────────────────────────────────────────────
create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  tx_signature text,
  amount_cents bigint,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app' check (source in ('app', 'settlement', 'worker', 'chain', 'admin', 'system')),
  status text not null default 'ok' check (status in ('ok', 'pending', 'failed'))
);
create index if not exists platform_events_at_idx on public.platform_events (at desc);
create index if not exists platform_events_type_idx on public.platform_events (type, at desc);
create index if not exists platform_events_user_idx on public.platform_events (user_id, at desc);
create index if not exists platform_events_room_idx on public.platform_events (room_id, at desc);
alter table public.platform_events enable row level security;
drop policy if exists platform_events_admin_read on public.platform_events;
create policy platform_events_admin_read on public.platform_events for select using (public.is_admin((select auth.uid())));
alter publication supabase_realtime add table public.platform_events;

create or replace function public.log_event(
  p_type text, p_user uuid default null, p_room uuid default null, p_match uuid default null,
  p_tx text default null, p_amount bigint default null, p_meta jsonb default '{}'::jsonb,
  p_source text default 'app', p_status text default 'ok', p_at timestamptz default now()
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into platform_events (at, type, user_id, room_id, match_id, tx_signature, amount_cents, metadata, source, status)
  values (coalesce(p_at, now()), p_type, p_user, p_room, p_match, p_tx, p_amount, coalesce(p_meta, '{}'::jsonb), p_source, p_status);
exception when others then
  raise warning 'log_event(%) failed: %', p_type, sqlerrm;
end;
$$;
revoke execute on function public.log_event(text, uuid, uuid, uuid, text, bigint, jsonb, text, text, timestamptz) from public, anon, authenticated;

-- A match id stored as text on rooms → uuid, or null.
create or replace function public.as_match_uuid(p text) returns uuid language sql immutable as $$
  select case when p ~ '^[0-9a-f-]{36}$' then p::uuid end;
$$;

-- Profiles: signups, wallets, profile edits.
create or replace function public.events_profiles() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_event('USER_SIGNUP', new.id, p_meta => jsonb_build_object('username', new.username));
  else
    if old.dynamic_wallet_address is null and new.dynamic_wallet_address is not null then
      perform log_event('WALLET_CONNECTED', new.id, p_meta => jsonb_build_object('wallet', new.dynamic_wallet_address));
    end if;
    if new.display_name is distinct from old.display_name or new.avatar_url is distinct from old.avatar_url
       or new.bio is distinct from old.bio or new.username is distinct from old.username then
      perform log_event('USER_PROFILE_UPDATED', new.id);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_events on public.profiles;
create trigger profiles_events after insert or update on public.profiles for each row execute function public.events_profiles();

-- Rooms: created, went live, held (safety window), result, settled/refunded.
create or replace function public.events_rooms() returns trigger language plpgsql security definer set search_path = public as $$
declare m uuid := as_match_uuid(new.match_id);
begin
  if tg_op = 'INSERT' then
    perform log_event('ROOM_CREATED', new.creator_id, new.id, m,
      p_meta => jsonb_build_object('prediction', new.prediction, 'visibility', new.visibility, 'market', new.market_type, 'fee_bps', new.fee_bps, 'host_fee_bps', new.host_fee_bps));
  else
    if old.status = 'open' and new.status = 'live' then
      perform log_event('ROOM_STARTED', null, new.id, m, p_amount => new.pool_total_cents, p_meta => jsonb_build_object('participants', new.participant_count), p_source => 'settlement');
    end if;
    if old.pending_outcome is null and new.pending_outcome is not null then
      perform log_event('RESULT_HELD', null, new.id, m, p_meta => jsonb_build_object('outcome', new.pending_outcome, 'reason', 'decided early — safety window'), p_source => 'settlement', p_status => 'pending');
    end if;
    if old.resolved_outcome is null and new.resolved_outcome is not null then
      perform log_event('RESULT_RECEIVED', null, new.id, m, p_amount => new.pool_total_cents, p_meta => jsonb_build_object('outcome', new.resolved_outcome), p_source => 'settlement');
    end if;
    if new.status in ('settled', 'refunded') and old.status is distinct from new.status then
      perform log_event('SETTLEMENT_COMPLETED', null, new.id, m, p_amount => new.pool_total_cents,
        p_meta => jsonb_build_object('outcome', new.resolved_outcome, 'status', new.status, 'participants', new.participant_count), p_source => 'settlement');
    end if;
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform log_event('ROOM_CANCELLED', null, new.id, m, p_source => 'settlement');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists rooms_events on public.rooms;
create trigger rooms_events after insert or update on public.rooms for each row execute function public.events_rooms();

-- Entries: stakes placed, payouts sent.
create or replace function public.events_entries() returns trigger language plpgsql security definer set search_path = public as $$
declare r rooms%rowtype;
begin
  select * into r from rooms where id = new.room_id;
  if tg_op = 'INSERT' then
    perform log_event('STAKE_PLACED', new.user_id, new.room_id, as_match_uuid(r.match_id), new.stake_tx_signature, new.amount_cents,
      jsonb_build_object('side', new.side, 'is_creator', new.user_id = r.creator_id), 'chain');
  elsif old.payout_tx_signature is null and new.payout_tx_signature is not null then
    perform log_event(case when new.is_winner is null then 'REFUND_SENT' else 'PAYOUT_SENT' end, new.user_id, new.room_id, as_match_uuid(r.match_id),
      new.payout_tx_signature, new.payout_cents, jsonb_build_object('side', new.side, 'stake', new.amount_cents), 'settlement');
  end if;
  return new;
end;
$$;
drop trigger if exists entries_events on public.entries;
create trigger entries_events after insert or update of payout_tx_signature on public.entries for each row execute function public.events_entries();

-- Matches with rooms on them: started, finished, postponed/cancelled.
create or replace function public.events_matches() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and exists (select 1 from rooms r where r.match_id = new.id::text) then
    perform log_event(case new.status when 'live' then 'MATCH_STARTED' when 'finished' then 'MATCH_FINISHED' else 'MATCH_' || upper(new.status) end,
      null, null, new.id, p_meta => jsonb_build_object('home', new.home_team, 'away', new.away_team, 'score', coalesce(new.home_score, 0) || '–' || coalesce(new.away_score, 0), 'provider', new.provider),
      p_source => 'worker');
  end if;
  return new;
end;
$$;
drop trigger if exists matches_events on public.matches;
create trigger matches_events after update of status on public.matches for each row execute function public.events_matches();

-- Social: posts, chat, reactions, follows, reports.
create or replace function public.events_social() returns trigger language plpgsql security definer set search_path = public as $$
begin
  case tg_table_name
    when 'posts' then perform log_event(case when new.parent_id is null then 'POST_CREATED' else 'REPLY_CREATED' end, new.author_id, new.room_id, new.match_id,
      p_meta => jsonb_build_object('post_id', new.id, 'side', new.side, 'has_media', new.attachment is not null));
    when 'messages' then perform log_event('CHAT_MESSAGE', new.user_id, new.room_id, p_meta => jsonb_build_object('message_id', new.id, 'has_media', new.attachment is not null));
    when 'arena_reactions' then perform log_event('REACTION', new.user_id, p_meta => jsonb_build_object('target', new.target_kind, 'target_id', new.target_id, 'emoji', new.emoji));
    when 'message_reactions' then perform log_event('REACTION', new.user_id, new.room_id, p_meta => jsonb_build_object('target', 'message', 'target_id', new.message_id, 'emoji', new.emoji));
    when 'follows' then perform log_event('FOLLOW', new.follower_id, p_meta => jsonb_build_object('following_id', new.following_id));
    when 'content_reports' then perform log_event('REPORT_CREATED', new.reporter_id, p_meta => jsonb_build_object('target', new.target_kind, 'target_id', new.target_id, 'reason', new.reason));
    when 'league_members' then perform log_event('LEAGUE_JOINED', new.user_id, p_meta => jsonb_build_object('league_id', new.league_id));
    else null;
  end case;
  return new;
end;
$$;
drop trigger if exists posts_events on public.posts;
create trigger posts_events after insert on public.posts for each row execute function public.events_social();
drop trigger if exists messages_events on public.messages;
create trigger messages_events after insert on public.messages for each row execute function public.events_social();
drop trigger if exists arena_reactions_events on public.arena_reactions;
create trigger arena_reactions_events after insert on public.arena_reactions for each row execute function public.events_social();
drop trigger if exists message_reactions_events on public.message_reactions;
create trigger message_reactions_events after insert on public.message_reactions for each row execute function public.events_social();
drop trigger if exists follows_events on public.follows;
create trigger follows_events after insert on public.follows for each row execute function public.events_social();
drop trigger if exists content_reports_events on public.content_reports;
create trigger content_reports_events after insert on public.content_reports for each row execute function public.events_social();
drop trigger if exists league_members_events on public.league_members;
create trigger league_members_events after insert on public.league_members for each row execute function public.events_social();

-- Money: deposits/withdrawals, failed stakes, fees, claims.
create or replace function public.events_money() returns trigger language plpgsql security definer set search_path = public as $$
begin
  case tg_table_name
    when 'wallet_transactions' then perform log_event(upper(new.type), new.user_id, p_tx => new.tx_signature, p_amount => (new.amount_micros / 10000)::bigint,
      p_meta => jsonb_build_object('counterparty', new.counterparty_address), p_source => 'chain');
    when 'stake_intents' then
      if new.status = 'failed' and old.status is distinct from 'failed' then
        perform log_event('STAKE_FAILED', new.user_id, new.room_id, p_tx => new.tx_signature, p_amount => new.amount_cents,
          p_meta => jsonb_build_object('kind', new.kind, 'intent', new.id, 'error', left(coalesce(new.error, ''), 200)), p_source => 'chain', p_status => 'failed');
      end if;
    when 'room_fees' then perform log_event('FEE_EARNED', new.recipient_id, new.room_id, p_amount => new.cents, p_meta => jsonb_build_object('kind', new.kind), p_source => 'settlement');
    when 'fee_claims' then
      if tg_op = 'INSERT' then
        perform log_event('CLAIM_STARTED', new.user_id, p_amount => new.cents, p_meta => jsonb_build_object('kind', new.kind, 'claim_id', new.id), p_status => 'pending');
      elsif new.status is distinct from old.status and new.status in ('confirmed', 'failed') then
        perform log_event(case new.status when 'confirmed' then 'CLAIM_COMPLETED' else 'CLAIM_FAILED' end, new.user_id, p_tx => new.payout_tx_signature, p_amount => new.cents,
          p_meta => jsonb_build_object('kind', new.kind, 'claim_id', new.id), p_source => 'chain', p_status => case new.status when 'confirmed' then 'ok' else 'failed' end);
      end if;
    else null;
  end case;
  return new;
end;
$$;
drop trigger if exists wallet_transactions_events on public.wallet_transactions;
create trigger wallet_transactions_events after insert on public.wallet_transactions for each row execute function public.events_money();
drop trigger if exists stake_intents_events on public.stake_intents;
create trigger stake_intents_events after update of status on public.stake_intents for each row execute function public.events_money();
drop trigger if exists room_fees_events on public.room_fees;
create trigger room_fees_events after insert on public.room_fees for each row execute function public.events_money();
drop trigger if exists fee_claims_events on public.fee_claims;
create trigger fee_claims_events after insert or update of status on public.fee_claims for each row execute function public.events_money();

revoke execute on function public.events_profiles(), public.events_rooms(), public.events_entries(), public.events_matches(),
  public.events_social(), public.events_money() from public, anon, authenticated;

-- ── Audit ────────────────────────────────────────────────────────────
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  reason text,
  before jsonb,
  after jsonb
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_type, target_id, at desc);
alter table public.admin_audit enable row level security;
drop policy if exists admin_audit_read on public.admin_audit;
create policy admin_audit_read on public.admin_audit for select using (public.is_admin((select auth.uid())));

-- ── Moderation ───────────────────────────────────────────────────────
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists moderation_reason text;

create or replace function public.is_restricted(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_user and (banned_at is not null or suspended_until > now()));
$$;
grant execute on function public.is_restricted(uuid) to anon, authenticated;

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_user_idx on public.admin_notes (user_id, created_at desc);
alter table public.admin_notes enable row level security;
drop policy if exists admin_notes_read on public.admin_notes;
create policy admin_notes_read on public.admin_notes for select using (public.is_admin((select auth.uid())));

create table if not exists public.user_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  flag text not null check (flag in ('watch', 'spam', 'abuse', 'fraud_risk', 'multi_account', 'other')),
  note text,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by uuid references public.profiles(id) on delete set null
);
create index if not exists user_flags_user_idx on public.user_flags (user_id) where cleared_at is null;
alter table public.user_flags enable row level security;
drop policy if exists user_flags_read on public.user_flags;
create policy user_flags_read on public.user_flags for select using (public.is_admin((select auth.uid())));

-- A report's outcome, decided per reported item (all its reports at once).
alter table public.content_reports add column if not exists resolution text check (resolution in ('removed', 'kept'));
alter table public.content_reports add column if not exists resolved_at timestamptz;
alter table public.content_reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

-- ── Feature flags (enforced below and in the app) ────────────────────
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.feature_flags (key, enabled, description) values
  ('stakes_paused', false, 'Stop all new stakes (joining rooms) — settlement and payouts keep running.'),
  ('room_creation_paused', false, 'Stop new rooms from being created.'),
  ('arena_posting_paused', false, 'Stop new Arena posts and replies.'),
  ('chat_paused', false, 'Stop new room chat messages.')
on conflict (key) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select using (true);

create or replace function public.feature_on(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from feature_flags where key = p_key), false);
$$;
grant execute on function public.feature_on(text) to anon, authenticated;

-- Platform-wide stake cap (null = no cap), enforced in the stake action.
alter table public.platform_settings add column if not exists max_stake_cents bigint check (max_stake_cents is null or max_stake_cents > 0);

-- Enforcement: chat.
drop policy if exists messages_insert_self on public.messages;
create policy messages_insert_self on public.messages for insert with check (
  user_id = (select auth.uid())
  and not public.is_restricted((select auth.uid()))
  and not public.feature_on('chat_paused')
  and (
    (exists (select 1 from rooms r where r.id = messages.room_id and r.visibility = 'public' and r.allow_spectators))
    or (exists (select 1 from rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid())))
    or room_has_participant(room_id, (select auth.uid()))
  )
);

-- Enforcement: Arena posts (the existing before-insert rules, plus bans and the pause switch).
do $patch$
declare d text := pg_get_functiondef('public.posts_before_insert'::regproc);
begin
  if position('is_restricted' in d) = 0 then
    d := replace(d, E'begin
  if (select count(*) from posts p where p.author_id = new.author_id',
      E'begin
  if is_restricted(new.author_id) then raise exception ''account_restricted''; end if;
  if feature_on(''arena_posting_paused'') then raise exception ''posting_paused''; end if;
  if (select count(*) from posts p where p.author_id = new.author_id');
    if position('is_restricted' in d) = 0 then raise exception 'posts_before_insert patch did not apply'; end if;
    execute d;
  end if;
end
$patch$;

-- ── Activity days (DAU/WAU/MAU, retention) ───────────────────────────
create table if not exists public.user_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
create index if not exists user_activity_days_day_idx on public.user_activity_days (day);
alter table public.user_activity_days enable row level security;
drop policy if exists user_activity_days_read on public.user_activity_days;
create policy user_activity_days_read on public.user_activity_days for select using (public.is_admin((select auth.uid())));

create or replace function public.touch_active()
returns void language sql security definer set search_path = public as $$
  insert into user_activity_days (user_id, day) select auth.uid(), (now() at time zone 'utc')::date where auth.uid() is not null
  on conflict do nothing;
$$;
grant execute on function public.touch_active() to authenticated;

-- ── Job runs ─────────────────────────────────────────────────────────
create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists job_runs_job_idx on public.job_runs (job, started_at desc);
alter table public.job_runs enable row level security;
drop policy if exists job_runs_read on public.job_runs;
create policy job_runs_read on public.job_runs for select using (public.is_admin((select auth.uid())));

-- ── Backfill: history as events, so timelines and charts start complete ──
insert into platform_events (at, type, user_id, metadata, source)
select p.created_at, 'USER_SIGNUP', p.id, jsonb_build_object('username', p.username, 'backfilled', true), 'app' from profiles p
where not exists (select 1 from platform_events e where e.type = 'USER_SIGNUP' and e.user_id = p.id);

insert into platform_events (at, type, user_id, room_id, match_id, metadata, source)
select r.created_at, 'ROOM_CREATED', r.creator_id, r.id, as_match_uuid(r.match_id),
  jsonb_build_object('prediction', r.prediction, 'visibility', r.visibility, 'market', r.market_type, 'backfilled', true), 'app'
from rooms r where not exists (select 1 from platform_events e where e.type = 'ROOM_CREATED' and e.room_id = r.id);

insert into platform_events (at, type, user_id, room_id, match_id, tx_signature, amount_cents, metadata, source)
select e.created_at, 'STAKE_PLACED', e.user_id, e.room_id, as_match_uuid(r.match_id), e.stake_tx_signature, e.amount_cents,
  jsonb_build_object('side', e.side, 'is_creator', e.user_id = r.creator_id, 'backfilled', true), 'chain'
from entries e join rooms r on r.id = e.room_id
where not exists (select 1 from platform_events x where x.type = 'STAKE_PLACED' and x.room_id = e.room_id and x.user_id = e.user_id);

insert into platform_events (at, type, user_id, room_id, match_id, tx_signature, amount_cents, metadata, source)
select coalesce(r.settled_at, r.resolved_at, e.created_at), case when e.is_winner is null then 'REFUND_SENT' else 'PAYOUT_SENT' end, e.user_id, e.room_id,
  as_match_uuid(r.match_id), e.payout_tx_signature, e.payout_cents, jsonb_build_object('side', e.side, 'stake', e.amount_cents, 'backfilled', true), 'settlement'
from entries e join rooms r on r.id = e.room_id where e.payout_tx_signature is not null
and not exists (select 1 from platform_events x where x.type in ('PAYOUT_SENT', 'REFUND_SENT') and x.room_id = e.room_id and x.user_id = e.user_id);

insert into platform_events (at, type, room_id, match_id, amount_cents, metadata, source)
select r.settled_at, 'SETTLEMENT_COMPLETED', r.id, as_match_uuid(r.match_id), r.pool_total_cents,
  jsonb_build_object('outcome', r.resolved_outcome, 'status', r.status, 'participants', r.participant_count, 'backfilled', true), 'settlement'
from rooms r where r.status in ('settled', 'refunded') and r.settled_at is not null
and not exists (select 1 from platform_events x where x.type = 'SETTLEMENT_COMPLETED' and x.room_id = r.id);

insert into platform_events (at, type, user_id, tx_signature, amount_cents, metadata, source)
select w.created_at, upper(w.type), w.user_id, w.tx_signature, (w.amount_micros / 10000)::bigint, jsonb_build_object('counterparty', w.counterparty_address, 'backfilled', true), 'chain'
from wallet_transactions w where not exists (select 1 from platform_events x where x.tx_signature = w.tx_signature and x.type = upper(w.type));

insert into platform_events (at, type, user_id, room_id, tx_signature, amount_cents, metadata, source, status)
select s.created_at, 'STAKE_FAILED', s.user_id, s.room_id, s.tx_signature, s.amount_cents,
  jsonb_build_object('kind', s.kind, 'intent', s.id, 'error', left(coalesce(s.error, ''), 200), 'backfilled', true), 'chain', 'failed'
from stake_intents s where s.status = 'failed'
and not exists (select 1 from platform_events x where x.type = 'STAKE_FAILED' and x.metadata->>'intent' = s.id::text);

insert into platform_events (at, type, user_id, room_id, metadata, source)
select m.created_at, 'CHAT_MESSAGE', m.user_id, m.room_id, jsonb_build_object('message_id', m.id, 'backfilled', true), 'app'
from messages m where m.user_id is not null
and not exists (select 1 from platform_events x where x.type = 'CHAT_MESSAGE' and x.metadata->>'message_id' = m.id::text);

-- Activity days from everything we know people did.
insert into user_activity_days (user_id, day)
select distinct e.user_id, (e.at at time zone 'utc')::date from platform_events e where e.user_id is not null
on conflict do nothing;
