-- Admin analytics: the numbers /admin shows, computed in one place (the
-- database) from the tables that record the facts. Service role only —
-- the admin app calls these after its own server-side admin check.

-- Where a room is in its life, for operations (one definition, used by
-- every admin screen): open → live → awaiting_result → verifying (decided
-- early, safety window) → settling (result in, payouts going out) →
-- settled / refunded / cancelled; stuck = no result a day after kickoff.
create or replace function public.admin_room_state(r rooms, m matches)
returns text language sql stable as $$
  select case
    when r.status = 'settled' then 'settled'
    when r.status = 'refunded' then 'refunded'
    when r.status = 'cancelled' then 'cancelled'
    when r.resolved_outcome is not null then 'settling'
    when r.pending_outcome is not null then 'verifying'
    when m.kickoff_at is not null and m.kickoff_at < now() - interval '24 hours' then 'stuck'
    when m.status = 'finished' then 'awaiting_result'
    when r.status = 'live' or m.status = 'live' then 'live'
    else 'open'
  end;
$$;

create or replace function public.admin_overview()
returns jsonb language sql stable security definer set search_path = public as $$
  with rs as (
    select public.admin_room_state(r, m) as state, r.* from rooms r left join matches m on m.id::text = r.match_id
  ),
  today as (select (now() at time zone 'utc')::date as d)
  select jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_today', (select count(*) from profiles, today where (created_at at time zone 'utc')::date = today.d),
    'active_today', (select count(*) from user_activity_days, today where day = today.d),
    'active_7d', (select count(distinct user_id) from user_activity_days where day > (now() at time zone 'utc')::date - 7),
    'active_30d', (select count(distinct user_id) from user_activity_days where day > (now() at time zone 'utc')::date - 30),
    'wallets', (select count(*) from profiles where dynamic_wallet_address is not null),
    'rooms_total', (select count(*) from rooms),
    'rooms_today', (select count(*) from rooms, today where (created_at at time zone 'utc')::date = today.d),
    'rooms_by_state', (select coalesce(jsonb_object_agg(state, n), '{}'::jsonb) from (select state, count(*) n from rs group by state) s),
    'predictions_total', (select count(*) from entries),
    'predictions_today', (select count(*) from entries, today where (created_at at time zone 'utc')::date = today.d),
    'volume_total', (select coalesce(sum(amount_cents), 0) from entries),
    'volume_today', (select coalesce(sum(amount_cents), 0) from entries, today where (created_at at time zone 'utc')::date = today.d),
    'avg_stake', (select coalesce(round(avg(amount_cents)), 0) from entries),
    'avg_participants', (select coalesce(round(avg(participant_count)::numeric, 1), 0) from rooms where participant_count > 0),
    'avg_pool', (select coalesce(round(avg(pool_total_cents)), 0) from rooms where pool_total_cents > 0),
    'payout_volume', (select coalesce(sum(payout_cents), 0) from entries where payout_tx_signature is not null and is_winner),
    'refund_volume', (select coalesce(sum(payout_cents), 0) from entries where payout_tx_signature is not null and is_winner is null),
    'fees_total', (select coalesce(sum(cents), 0) from room_fees),
    'fees_today', (select coalesce(sum(cents), 0) from room_fees, today where (created_at at time zone 'utc')::date = today.d),
    'fees_rivaly', (select coalesce(sum(cents), 0) from room_fees where kind = 'rivaly'),
    'fees_host', (select coalesce(sum(cents), 0) from room_fees where kind = 'host'),
    'stakes_failed_24h', (select count(*) from stake_intents where status = 'failed' and created_at > now() - interval '24 hours'),
    'settlement_failed_24h', (select count(*) from platform_events where type = 'SETTLEMENT_FAILED' and at > now() - interval '24 hours'),
    'claims_failed_24h', (select count(*) from fee_claims where status = 'failed' and created_at > now() - interval '24 hours'),
    'system_errors_24h', (select count(*) from platform_events where type = 'SYSTEM_ERROR' and at > now() - interval '24 hours'),
    'jobs_failed_24h', (select count(*) from job_runs where ok = false and started_at > now() - interval '24 hours'),
    -- A match with money on it that's live but hasn't updated in 15 minutes.
    'stale_live_matches', (select count(distinct m.id) from matches m join rooms r on r.match_id = m.id::text
                            where m.status = 'live' and m.updated_at < now() - interval '15 minutes' and r.status in ('open', 'live')),
    'open_reports', (select count(distinct (target_kind, target_id)) from content_reports where resolution is null)
  );
$$;

-- One row per day: the time series every chart reads.
create or replace function public.admin_daily(p_days int default 30)
returns table(day date, signups int, active int, rooms int, stakes int, volume_cents bigint, fees_cents bigint,
              posts int, messages int, reactions int, follows int, payouts_cents bigint)
language sql stable security definer set search_path = public as $$
  with days as (
    select generate_series((now() at time zone 'utc')::date - (greatest(p_days, 1) - 1), (now() at time zone 'utc')::date, interval '1 day')::date as day
  )
  select d.day,
    (select count(*) from profiles p where (p.created_at at time zone 'utc')::date = d.day)::int,
    (select count(*) from user_activity_days a where a.day = d.day)::int,
    (select count(*) from rooms r where (r.created_at at time zone 'utc')::date = d.day)::int,
    (select count(*) from entries e where (e.created_at at time zone 'utc')::date = d.day)::int,
    (select coalesce(sum(e.amount_cents), 0) from entries e where (e.created_at at time zone 'utc')::date = d.day)::bigint,
    (select coalesce(sum(f.cents), 0) from room_fees f where (f.created_at at time zone 'utc')::date = d.day)::bigint,
    (select count(*) from posts p where (p.created_at at time zone 'utc')::date = d.day)::int,
    (select count(*) from messages m where (m.created_at at time zone 'utc')::date = d.day)::int,
    ((select count(*) from arena_reactions x where (x.created_at at time zone 'utc')::date = d.day)
      + (select count(*) from message_reactions x where (x.created_at at time zone 'utc')::date = d.day))::int,
    (select count(*) from follows f where (f.created_at at time zone 'utc')::date = d.day)::int,
    (select coalesce(sum(ev.amount_cents), 0) from platform_events ev where ev.type = 'PAYOUT_SENT' and (ev.at at time zone 'utc')::date = d.day)::bigint
  from days d order by d.day;
$$;

-- Weekly retention: of the people who signed up in a week, how many came
-- back in each following week.
create or replace function public.admin_retention(p_weeks int default 8)
returns table(cohort date, size int, week int, retained int)
language sql stable security definer set search_path = public as $$
  with cohorts as (
    select id, date_trunc('week', created_at at time zone 'utc')::date as cohort from profiles
    where created_at > now() - make_interval(weeks => greatest(p_weeks, 1))
  ),
  sizes as (select cohort, count(*)::int as size from cohorts group by cohort),
  weeks as (select generate_series(0, greatest(p_weeks, 1) - 1) as week)
  select s.cohort, s.size, w.week,
    (select count(distinct c.id) from cohorts c join user_activity_days a on a.user_id = c.id
      where c.cohort = s.cohort and a.day >= s.cohort + w.week * 7 and a.day < s.cohort + (w.week + 1) * 7)::int
  from sizes s cross join weeks w
  where s.cohort + w.week * 7 <= (now() at time zone 'utc')::date
  order by s.cohort, w.week;
$$;

-- The activation funnel for everyone who signed up since p_since.
create or replace function public.admin_funnel(p_since timestamptz default now() - interval '90 days')
returns jsonb language sql stable security definer set search_path = public as $$
  with c as (select id, dynamic_wallet_address from profiles where created_at >= p_since),
  n as (select c.id, c.dynamic_wallet_address is not null as wallet,
          (select count(*) from entries e where e.user_id = c.id) as stakes,
          exists (select 1 from rooms r where r.creator_id = c.id) as hosted,
          exists (select 1 from posts p where p.author_id = c.id) as posted,
          exists (select 1 from entries e join rooms r on r.id = e.room_id where e.user_id = c.id and e.user_id <> r.creator_id) as joined_other
        from c)
  select jsonb_build_object(
    'signed_up', (select count(*) from n),
    'wallet', (select count(*) from n where wallet),
    'first_stake', (select count(*) from n where stakes >= 1),
    'joined_someone_elses_room', (select count(*) from n where joined_other),
    'hosted_a_room', (select count(*) from n where hosted),
    'second_stake', (select count(*) from n where stakes >= 2),
    'posted_in_arena', (select count(*) from n where posted),
    -- Median hours from signup to first stake.
    'median_hours_to_first_stake', (select round((percentile_cont(0.5) within group (order by extract(epoch from (fe.first - p.created_at)) / 3600))::numeric, 1)
       from profiles p join (select user_id, min(created_at) as first from entries group by user_id) fe on fe.user_id = p.id where p.created_at >= p_since)
  );
$$;

-- The users table: one row per person, everything an operator needs.
create or replace function public.admin_users(p_search text default null, p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns table(id uuid, username text, display_name text, avatar_url text, created_at timestamptz, last_active date,
              wallet text, rooms_created int, rooms_joined int, predictions int, staked_cents bigint, won_cents bigint,
              lost_cents bigint, host_fees_cents bigint, decided int, wins int, suspended_until timestamptz, banned_at timestamptz,
              reports_received int, open_flags int, total_count bigint)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.*,
      (select max(a.day) from user_activity_days a where a.user_id = p.id) as last_active,
      (select count(*) from rooms r where r.creator_id = p.id)::int as rooms_created,
      (select count(*) from entries e join rooms r on r.id = e.room_id where e.user_id = p.id and r.creator_id <> p.id)::int as rooms_joined,
      (select count(*) from entries e where e.user_id = p.id)::int as predictions,
      (select coalesce(sum(e.amount_cents), 0) from entries e where e.user_id = p.id)::bigint as staked_cents,
      (select coalesce(sum(e.payout_cents - e.amount_cents), 0) from entries e where e.user_id = p.id and e.is_winner)::bigint as won_cents,
      (select coalesce(sum(e.amount_cents), 0) from entries e where e.user_id = p.id and e.is_winner = false)::bigint as lost_cents,
      (select coalesce(sum(f.cents), 0) from room_fees f join rooms r on r.id = f.room_id where r.creator_id = p.id)::bigint as host_fees_cents,
      (select count(*) from entries e where e.user_id = p.id and e.is_winner is not null)::int as decided,
      (select count(*) from entries e where e.user_id = p.id and e.is_winner)::int as wins,
      ((select count(*) from content_reports cr join posts po on cr.target_kind = 'post' and po.id = cr.target_id where po.author_id = p.id)
        + (select count(*) from content_reports cr join messages me on cr.target_kind = 'message' and me.id = cr.target_id where me.user_id = p.id))::int as reports_received,
      (select count(*) from user_flags uf where uf.user_id = p.id and uf.cleared_at is null)::int as open_flags
    from profiles p
    where p_search is null or p_search = ''
       or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
       or p.id::text = p_search or p.dynamic_wallet_address = p_search
  ),
  filtered as (
    select * from base b where case coalesce(p_filter, 'all')
      when 'new' then b.created_at > now() - interval '7 days'
      when 'active' then b.last_active > (now() at time zone 'utc')::date - 7
      when 'inactive' then b.last_active is null or b.last_active <= (now() at time zone 'utc')::date - 30
      when 'high_volume' then b.staked_cents >= 10000
      when 'suspended' then b.suspended_until > now()
      when 'banned' then b.banned_at is not null
      when 'reported' then b.reports_received > 0
      when 'flagged' then b.open_flags > 0
      when 'wallet' then b.dynamic_wallet_address is not null
      when 'no_wallet' then b.dynamic_wallet_address is null
      else true end
  )
  select f.id, f.username, f.display_name, f.avatar_url, f.created_at, f.last_active, f.dynamic_wallet_address,
    f.rooms_created, f.rooms_joined, f.predictions, f.staked_cents, f.won_cents, f.lost_cents, f.host_fees_cents,
    f.decided, f.wins, f.suspended_until, f.banned_at, f.reports_received, f.open_flags, count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
$$;

-- The rooms table, with each room's operational state.
create or replace function public.admin_rooms(p_state text default null, p_search text default null, p_limit int default 50, p_offset int default 0)
returns table(id uuid, state text, status text, prediction text, visibility text, creator_id uuid, creator_username text,
              match_id uuid, home_team text, away_team text, competition text, kickoff_at timestamptz, match_status text, provider text,
              participants int, pool_cents bigint, yes_cents bigint, no_cents bigint, fee_bps int, host_fee_bps int,
              resolved_outcome text, pending_outcome text, created_at timestamptz, settled_at timestamptz, total_count bigint)
language sql stable security definer set search_path = public as $$
  with rs as (
    select public.admin_room_state(r, m) as state, r.*, m.id as mid, m.home_team, m.away_team, m.competition, m.kickoff_at, m.status as mstatus, m.provider,
      p.username as creator_username
    from rooms r left join matches m on m.id::text = r.match_id left join profiles p on p.id = r.creator_id
  )
  select rs.id, rs.state, rs.status, rs.prediction, rs.visibility, rs.creator_id, rs.creator_username, rs.mid, rs.home_team, rs.away_team,
    rs.competition, rs.kickoff_at, rs.mstatus, rs.provider, rs.participant_count, rs.pool_total_cents, rs.yes_total_cents, rs.no_total_cents,
    rs.fee_bps, rs.host_fee_bps, rs.resolved_outcome, rs.pending_outcome, rs.created_at, rs.settled_at, count(*) over ()
  from rs
  where (p_state is null or p_state = '' or p_state = 'all'
         or (p_state = 'pending' and rs.state in ('awaiting_result', 'verifying', 'settling', 'stuck'))
         or rs.state = p_state)
    and (p_search is null or p_search = '' or rs.prediction ilike '%' || p_search || '%' or rs.id::text = p_search
         or rs.home_team ilike '%' || p_search || '%' or rs.away_team ilike '%' || p_search || '%' or rs.creator_username ilike '%' || p_search || '%')
  order by rs.created_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
$$;

-- Matches operations: every match with money on it (or everything live/soon).
create or replace function public.admin_matches(p_view text default 'with_rooms', p_limit int default 100)
returns table(id uuid, provider text, competition text, home_team text, away_team text, kickoff_at timestamptz, status text,
              home_score int, away_score int, updated_at timestamptz, rooms int, open_rooms int, pool_cents bigint,
              final_confirmed boolean, events int, last_event_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.provider, m.competition, m.home_team, m.away_team, m.kickoff_at, m.status, m.home_score, m.away_score, m.updated_at,
    (select count(*) from rooms r where r.match_id = m.id::text)::int,
    (select count(*) from rooms r where r.match_id = m.id::text and r.status in ('open', 'live'))::int,
    (select coalesce(sum(r.pool_total_cents), 0) from rooms r where r.match_id = m.id::text)::bigint,
    exists (select 1 from match_events e where e.match_id = m.id and e.action = 'game_finalised'),
    (select count(*) from match_events e where e.match_id = m.id)::int,
    (select max(e.occurred_at) from match_events e where e.match_id = m.id)
  from matches m
  where case coalesce(p_view, 'with_rooms')
      when 'with_rooms' then exists (select 1 from rooms r where r.match_id = m.id::text)
      when 'live' then m.status = 'live'
      when 'today' then m.kickoff_at between date_trunc('day', now()) and date_trunc('day', now()) + interval '1 day'
      when 'upcoming' then m.status = 'scheduled' and m.kickoff_at between now() and now() + interval '7 days'
      when 'problems' then (m.status = 'live' and m.updated_at < now() - interval '15 minutes')
                        or (m.status = 'scheduled' and m.kickoff_at < now() - interval '3 hours')
                        or (m.status = 'finished' and m.home_score is null)
      else true end
  order by case when m.status = 'live' then 0 else 1 end, abs(extract(epoch from (m.kickoff_at - now())))
  limit least(greatest(p_limit, 1), 300);
$$;

revoke execute on function public.admin_overview(), public.admin_daily(int), public.admin_retention(int), public.admin_funnel(timestamptz),
  public.admin_users(text, text, int, int), public.admin_rooms(text, text, int, int), public.admin_matches(text, int)
  from public, anon, authenticated;
