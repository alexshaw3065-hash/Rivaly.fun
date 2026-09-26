-- The Rivaly card (a football-style player card) and You vs them, both from
-- settled rooms only — nothing seeded, nothing ranked against sample users.

-- player_card(user): the card's numbers. Six attributes, each 0–99:
--   ACC accuracy      % of settled rooms won
--   FRM form          last 5 results (a win is 20)
--   STR streak        current run of wins (each 15, up to 99)
--   EXP experience    settled rooms played (each 4, up to 99)
--   WIN winnings      where their net profit ranks among everyone who's played
--   FAN following     followers, on a log scale (1 → 20, 10 → 69, 30 → 99)
-- The overall rating is a weighted mix, and only shows from 3 settled rooms
-- ("unrated" before that, like accuracy on the Leaderboard). Tiers are fixed
-- lines, not percentiles: gold 75+, silver 60+, bronze below.
-- Public rooms only, same rule as the Leaderboard (these numbers are public).
create or replace function public.player_card(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with res as (
    select r.* from public.arena_results() r where r.is_public
  ),
  mine as (
    select * from res where user_id = p_user
  ),
  ordered as (
    select m.*, row_number() over (order by m.at desc) as n,
      sum(case when m.won then 0 else 1 end) over (order by m.at desc rows between unbounded preceding and current row) as losses_before
    from mine m
  ),
  totals as (
    select count(*)::int as played,
      count(*) filter (where won)::int as wins,
      coalesce(sum(profit_cents), 0)::bigint as profit,
      coalesce(sum(points), 0)::int as points
    from mine
  ),
  profits as (
    select user_id, sum(profit_cents) as profit from res group by user_id
  ),
  win_pct as (
    select case when (select count(*) from profits) = 0 or not exists (select 1 from profits where user_id = p_user) then 0
      else round(100.0 * (select count(*) from profits p2 where p2.profit < (select profit from profits where user_id = p_user))
        / greatest((select count(*) from profits) - 1, 1)) end as v
  ),
  facts as (
    select t.*,
      (select count(*)::int from ordered where losses_before = 0) as streak,
      coalesce((select jsonb_agg(case when won then 'W' else 'L' end order by n) from ordered where n <= 5), '[]'::jsonb) as form,
      coalesce((select sum(case when won then 20 else 0 end) from ordered where n <= 5), 0)::int as form_score,
      (select follower_count from profiles where id = p_user) as followers,
      (select v from win_pct) as win_attr
    from totals t
  ),
  attrs as (
    select f.*,
      least(99, case when played > 0 then round(100.0 * wins / played) else 0 end)::int as acc,
      least(99, form_score)::int as frm,
      least(99, streak * 15)::int as str,
      least(99, played * 4)::int as exp,
      least(99, win_attr)::int as win,
      least(99, round(20 * ln(1 + coalesce(followers, 0)) / ln(2)))::int as fan
    from facts f
  ),
  rated as (
    select a.*,
      case when played >= 3 then round(0.30 * acc + 0.20 * frm + 0.15 * win + 0.15 * exp + 0.10 * str + 0.10 * fan)::int end as rating
    from attrs a
  )
  select jsonb_build_object(
    'played', played, 'wins', wins, 'losses', played - wins, 'profit', profit, 'points', points,
    'streak', streak, 'form', form, 'followers', coalesce(followers, 0),
    'rating', rating,
    'tier', case when rating is null then null when rating >= 75 then 'gold' when rating >= 60 then 'silver' else 'bronze' end,
    'attrs', jsonb_build_object('acc', acc, 'frm', frm, 'str', str, 'exp', exp, 'win', win, 'fan', fan))
  from rated;
$$;
grant execute on function public.player_card(uuid) to anon, authenticated;

-- head_to_head(other): you vs them — every settled room you were both in on
-- opposite sides (private rooms too: you were both there), who won each, the
-- last meeting, and how many rooms you're facing each other in right now.
create or replace function public.head_to_head(p_other uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  meetings as (
    select r.id as room_id, r.prediction, r.status, r.resolved_outcome, coalesce(r.settled_at, r.resolved_at) as at,
      r.match_id, e1.side as my_side, e1.is_winner as i_won, e2.is_winner as they_won
    from entries e1
    join entries e2 on e2.room_id = e1.room_id and e2.user_id = p_other and e2.side <> e1.side
    join rooms r on r.id = e1.room_id
    where e1.user_id = (select uid from me) and (select uid from me) <> p_other
  ),
  settled as (
    select * from meetings where status = 'settled' and resolved_outcome in ('yes', 'no')
  ),
  last as (
    select s.*, m.home_team, m.away_team from settled s
    left join matches m on m.id::text = s.match_id
    order by s.at desc nulls last limit 1
  )
  select jsonb_build_object(
    'mine', (select count(*) from settled where i_won)::int,
    'theirs', (select count(*) from settled where they_won)::int,
    'live', (select count(*) from meetings where status in ('open', 'live'))::int,
    'last', (select jsonb_build_object('roomId', room_id, 'prediction', prediction, 'mySide', my_side, 'iWon', i_won, 'at', at,
        'home', home_team, 'away', away_team) from last),
    'rematchMatchId', (
      select m2.id from last l, matches m2
      where m2.kickoff_at > now() and m2.status = 'scheduled'
        and (m2.home_team in (l.home_team, l.away_team) or m2.away_team in (l.home_team, l.away_team))
      order by m2.kickoff_at limit 1));
$$;
revoke execute on function public.head_to_head(uuid) from anon, public;
grant execute on function public.head_to_head(uuid) to authenticated;
