-- Traffic analytics (for /admin) and the Rivaly Data datasets (for
-- partners). All service-role only. Datasets suppress any group of fewer
-- than platform_settings.data_min_group distinct people.

-- ── Traffic ──────────────────────────────────────────────────────────
create or replace function public.admin_traffic(p_days int default 30)
returns jsonb language sql stable security definer set search_path = public as $$
  with ev as (select * from analytics_events where at > now() - make_interval(days => greatest(p_days, 1))),
  sess as (
    select session_id, min(at) as started, max(at) as ended,
      count(*) filter (where event = 'page_view') as views, count(*) as events
    from ev group by session_id
  )
  select jsonb_build_object(
    'visitors', (select count(distinct anon_id) from ev),
    'signed_in_visitors', (select count(distinct user_id) from ev where user_id is not null),
    'sessions', (select count(*) from sess),
    'pageviews', (select count(*) from ev where event = 'page_view'),
    'events', (select count(*) from ev),
    'avg_session_seconds', (select coalesce(round(avg(extract(epoch from (ended - started)))), 0) from sess),
    'pages_per_session', (select coalesce(round(avg(views)::numeric, 2), 0) from sess),
    'bounce_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where events <= 1) / count(*), 1) end from sess)
  );
$$;

create or replace function public.admin_traffic_daily(p_days int default 30)
returns table(day date, visitors int, sessions int, pageviews int)
language sql stable security definer set search_path = public as $$
  with days as (select generate_series((now() at time zone 'utc')::date - (greatest(p_days, 1) - 1), (now() at time zone 'utc')::date, interval '1 day')::date as day)
  select d.day,
    (select count(distinct anon_id) from analytics_events e where (e.at at time zone 'utc')::date = d.day)::int,
    (select count(distinct session_id) from analytics_events e where (e.at at time zone 'utc')::date = d.day)::int,
    (select count(*) from analytics_events e where e.event = 'page_view' and (e.at at time zone 'utc')::date = d.day)::int
  from days d order by d.day;
$$;

-- Top values of one dimension: pages, referrers, campaigns, countries, devices, events.
create or replace function public.admin_top(p_dim text, p_days int default 30, p_limit int default 20)
returns table(label text, visitors int, total int)
language sql stable security definer set search_path = public as $$
  with ev as (select * from analytics_events where at > now() - make_interval(days => greatest(p_days, 1))
                and (p_dim <> 'path' or event = 'page_view'))
  select coalesce(nullif(case p_dim
      when 'path' then path when 'referrer' then referrer_host when 'utm_source' then utm_source
      when 'utm_campaign' then utm_campaign when 'utm_medium' then utm_medium
      when 'country' then country when 'device' then device when 'event' then event end, ''), '(none)') as label,
    count(distinct anon_id)::int, count(*)::int
  from ev group by 1 order by 3 desc limit least(greatest(p_limit, 1), 100);
$$;

-- Signups by first-touch source, and how well each source converts to staking.
create or replace function public.admin_acquisition(p_days int default 90)
returns table(source text, signups int, wallets int, stakers int, volume_cents bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.acquisition->>'source', ''), nullif(p.acquisition->>'referrer_host', ''), case when p.acquisition is null then '(before tracking)' else 'direct' end) as source,
    count(*)::int,
    count(*) filter (where p.dynamic_wallet_address is not null)::int,
    count(*) filter (where exists (select 1 from entries e where e.user_id = p.id))::int,
    coalesce(sum((select coalesce(sum(e.amount_cents), 0) from entries e where e.user_id = p.id)), 0)::bigint
  from profiles p where p.created_at > now() - make_interval(days => greatest(p_days, 1))
  group by 1 order by 2 desc;
$$;

-- An ordered funnel over tracked events: of the visitors who did step 1,
-- how many then did step 2 (later), then step 3, …
create or replace function public.admin_event_funnel(p_steps text[], p_days int default 30)
returns table(step int, event text, visitors int)
language plpgsql volatile security definer set search_path = public as $$
declare
  i int;
begin
  create temporary table if not exists _f (anon_id text primary key, t timestamptz) on commit drop;
  truncate _f;
  insert into _f select a.anon_id, min(a.at) from analytics_events a
    where a.event = p_steps[1] and a.at > now() - make_interval(days => greatest(p_days, 1)) group by a.anon_id;
  step := 1; event := p_steps[1]; visitors := (select count(*) from _f); return next;
  for i in 2 .. coalesce(array_length(p_steps, 1), 1) loop
    delete from _f f where not exists (select 1 from analytics_events e where e.anon_id = f.anon_id and e.event = p_steps[i] and e.at >= f.t);
    update _f f set t = (select min(e.at) from analytics_events e where e.anon_id = f.anon_id and e.event = p_steps[i] and e.at >= f.t);
    step := i; event := p_steps[i]; visitors := (select count(*) from _f); return next;
  end loop;
end;
$$;

revoke execute on function public.admin_traffic(int), public.admin_traffic_daily(int), public.admin_top(text, int, int),
  public.admin_acquisition(int), public.admin_event_funnel(text[], int) from public, anon, authenticated;

-- ── Rivaly Data datasets ─────────────────────────────────────────────
create or replace function public.data_min_group() returns int language sql stable security definer set search_path = public as $$
  select coalesce((select data_min_group from platform_settings where id), 5);
$$;

-- Crowd sentiment per match and claim: how many people, how much money on
-- each side, and the crowd's implied probability. Identical claims across
-- rooms (same match, same rule) are combined.
create or replace function public.data_match_sentiment(p_competition text default null, p_from timestamptz default now() - interval '30 days', p_to timestamptz default now() + interval '30 days', p_limit int default 500)
returns table(match_id uuid, competition text, home_team text, away_team text, kickoff_at timestamptz, match_status text, final_score text,
              claim text, market_type text, rooms int, predictors int, yes_money_cents bigint, no_money_cents bigint,
              crowd_yes_probability numeric, yes_share_of_people numeric, outcome text)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k),
  g as (
    select m.id as match_id, m.competition, m.home_team, m.away_team, m.kickoff_at, m.status as match_status,
      case when m.home_score is not null then m.home_score || '-' || m.away_score end as final_score,
      min(r.prediction) as claim, r.market_type, count(distinct r.id)::int as rooms,
      count(distinct e.user_id)::int as predictors,
      coalesce(sum(e.amount_cents) filter (where e.side = 'yes'), 0)::bigint as yes_money,
      coalesce(sum(e.amount_cents) filter (where e.side = 'no'), 0)::bigint as no_money,
      count(distinct e.user_id) filter (where e.side = 'yes')::numeric as yes_people,
      mode() within group (order by r.resolved_outcome) filter (where r.resolved_outcome in ('yes', 'no')) as outcome
    from rooms r join matches m on m.id::text = r.match_id join entries e on e.room_id = r.id
    where r.market_side_definition is not null and r.status <> 'cancelled'
      and m.kickoff_at between p_from and p_to and (p_competition is null or m.competition = p_competition)
    group by m.id, r.market_side_definition::text, r.market_type
  )
  select g.match_id, g.competition, g.home_team, g.away_team, g.kickoff_at, g.match_status, g.final_score, g.claim, g.market_type, g.rooms, g.predictors,
    g.yes_money, g.no_money,
    round(g.yes_money::numeric / nullif(g.yes_money + g.no_money, 0), 4),
    round(g.yes_people / nullif(g.predictors, 0), 4),
    g.outcome
  from g, k where g.predictors >= k.k
  order by g.kickoff_at desc limit least(greatest(p_limit, 1), 5000);
$$;

-- How money moved on each claim in the hours before kickoff.
create or replace function public.data_sentiment_timeline(p_match uuid)
returns table(claim text, hour timestamptz, yes_money_cents bigint, no_money_cents bigint, predictors int)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k),
  claims as (
    select r.market_side_definition::text as def, min(r.prediction) as claim, count(distinct e.user_id) as people
    from rooms r join entries e on e.room_id = r.id
    where r.match_id = p_match::text and r.market_side_definition is not null and r.status <> 'cancelled'
    group by 1
  ),
  hours as (
    select c.def, c.claim, date_trunc('hour', e.created_at) as hour, e.side, e.amount_cents, e.user_id
    from claims c cross join k
    join rooms r on r.match_id = p_match::text and r.market_side_definition::text = c.def
    join entries e on e.room_id = r.id
    where c.people >= k.k
  ),
  buckets as (select distinct def, claim, hour from hours)
  select b.claim, b.hour,
    (select coalesce(sum(h.amount_cents), 0) from hours h where h.def = b.def and h.side = 'yes' and h.hour <= b.hour)::bigint,
    (select coalesce(sum(h.amount_cents), 0) from hours h where h.def = b.def and h.side = 'no' and h.hour <= b.hour)::bigint,
    (select count(distinct h.user_id) from hours h where h.def = b.def and h.hour <= b.hour)::int
  from buckets b order by b.claim, b.hour;
$$;

-- Is the crowd right? For decided two-sided rooms: how often the side with
-- more money won, by competition and market.
create or replace function public.data_crowd_accuracy(p_from timestamptz default now() - interval '365 days', p_to timestamptz default now())
returns table(competition text, market_type text, decided_rooms int, predictors int, crowd_right_pct numeric, avg_winning_side_money_share numeric)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k),
  r as (
    select m.competition, r.market_type, r.id, r.resolved_outcome, r.yes_total_cents as y, r.no_total_cents as n
    from rooms r join matches m on m.id::text = r.match_id
    where r.resolved_outcome in ('yes', 'no') and r.yes_total_cents > 0 and r.no_total_cents > 0 and r.resolved_at between p_from and p_to
  )
  select r.competition, r.market_type, count(*)::int,
    (select count(distinct e.user_id) from entries e where e.room_id in (select id from r r2 where r2.competition = r.competition and r2.market_type = r.market_type))::int as people,
    round(100.0 * count(*) filter (where (r.y >= r.n and r.resolved_outcome = 'yes') or (r.n > r.y and r.resolved_outcome = 'no')) / count(*), 1),
    round(avg(case when r.resolved_outcome = 'yes' then r.y else r.n end::numeric / (r.y + r.n)), 4)
  from r, k group by r.competition, r.market_type, k.k
  having (select count(distinct e.user_id) from entries e where e.room_id in (select id from r r2 where r2.competition = r.competition and r2.market_type = r.market_type)) >= k.k
  order by 3 desc;
$$;

-- Fan engagement per match: how hard people went — rooms, people, chat,
-- reactions, Arena posts, and the chat surge in the 10 minutes after goals.
create or replace function public.data_fan_engagement(p_competition text default null, p_from timestamptz default now() - interval '30 days', p_to timestamptz default now())
returns table(match_id uuid, competition text, home_team text, away_team text, kickoff_at timestamptz, rooms int, participants int,
              chat_messages int, reactions int, arena_posts int, goals int, chat_in_10min_after_goals int)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k),
  m as (
    select m.* from matches m where m.kickoff_at between p_from and p_to and (p_competition is null or m.competition = p_competition)
      and exists (select 1 from rooms r where r.match_id = m.id::text)
  ),
  s as (
    select m.id as match_id, m.competition, m.home_team, m.away_team, m.kickoff_at,
      (select count(*) from rooms r where r.match_id = m.id::text)::int as rooms,
      (select count(distinct e.user_id) from entries e join rooms r on r.id = e.room_id where r.match_id = m.id::text)::int as participants,
      (select count(*) from messages x join rooms r on r.id = x.room_id where r.match_id = m.id::text)::int as chat,
      ((select count(*) from message_reactions x join rooms r on r.id = x.room_id where r.match_id = m.id::text)
        + (select count(*) from arena_reactions x join match_events me on x.target_kind = 'moment' and me.id = x.target_id where me.match_id = m.id))::int as reactions,
      (select count(*) from posts p where p.match_id = m.id)::int as posts,
      (select count(*) from match_events g where g.match_id = m.id and g.action = 'goal')::int as goals,
      (select count(*) from messages x join rooms r on r.id = x.room_id
        where r.match_id = m.id::text and exists (select 1 from match_events g where g.match_id = m.id and g.action = 'goal'
          and x.created_at between g.occurred_at and g.occurred_at + interval '10 minutes'))::int as surge
    from m
  )
  select s.match_id, s.competition, s.home_team, s.away_team, s.kickoff_at, s.rooms, s.participants, s.chat, s.reactions, s.posts, s.goals, s.surge
  from s, k where s.participants >= k.k order by s.kickoff_at desc;
$$;

-- Team support: people and money backing each team to win.
create or replace function public.data_team_support(p_competition text default null, p_from timestamptz default now() - interval '90 days', p_to timestamptz default now() + interval '30 days')
returns table(team text, competition text, matches int, backers int, money_backing_cents bigint, money_against_cents bigint, backing_share numeric)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k),
  t as (
    select case r.market_side_definition->>'outcome' when 'home' then m.home_team else m.away_team end as team,
      m.competition, m.id as match_id, e.user_id, e.side, e.amount_cents
    from rooms r join matches m on m.id::text = r.match_id join entries e on e.room_id = r.id
    where r.market_side_definition->>'stat' = 'winner' and r.market_side_definition->>'outcome' in ('home', 'away')
      and r.status <> 'cancelled' and m.kickoff_at between p_from and p_to and (p_competition is null or m.competition = p_competition)
  )
  select t.team, t.competition, count(distinct t.match_id)::int,
    count(distinct t.user_id) filter (where t.side = 'yes')::int,
    coalesce(sum(t.amount_cents) filter (where t.side = 'yes'), 0)::bigint,
    coalesce(sum(t.amount_cents) filter (where t.side = 'no'), 0)::bigint,
    round(coalesce(sum(t.amount_cents) filter (where t.side = 'yes'), 0)::numeric / nullif(sum(t.amount_cents), 0), 4)
  from t, k group by t.team, t.competition, k.k
  having count(distinct t.user_id) >= k.k
  order by 5 desc;
$$;

-- Market trends: what people predict on, per day, competition and market.
create or replace function public.data_market_trends(p_from timestamptz default now() - interval '30 days', p_to timestamptz default now())
returns table(day date, competition text, market_type text, rooms int, predictors int, volume_cents bigint)
language sql stable security definer set search_path = public as $$
  with k as (select data_min_group() as k)
  select (e.created_at at time zone 'utc')::date, m.competition, r.market_type, count(distinct r.id)::int, count(distinct e.user_id)::int, sum(e.amount_cents)::bigint
  from entries e join rooms r on r.id = e.room_id join matches m on m.id::text = r.match_id, k
  where e.created_at between p_from and p_to
  group by 1, 2, 3, k.k having count(distinct e.user_id) >= k.k
  order by 1 desc, 6 desc;
$$;

revoke execute on function public.data_min_group(), public.data_match_sentiment(text, timestamptz, timestamptz, int), public.data_sentiment_timeline(uuid),
  public.data_crowd_accuracy(timestamptz, timestamptz), public.data_fan_engagement(text, timestamptz, timestamptz),
  public.data_team_support(text, timestamptz, timestamptz), public.data_market_trends(timestamptz, timestamptz)
  from public, anon, authenticated;
