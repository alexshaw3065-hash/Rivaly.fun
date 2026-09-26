-- Profile trust fix:
--   • player_card() also returns the Leaderboard rank (all-time winnings,
--     public rooms) for players with a settled room.
--   • Banner and ring colours are saved to the account (they used to reset
--     on reload). Only the app's own palette values are accepted.

alter table public.profiles
  add column banner_color text check (banner_color ~ '^var\(--[a-z-]{3,40}\)$'),
  add column ring_color text check (ring_color ~ '^var\(--[a-z-]{3,40}\)$');

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
    'rank', case when played > 0 then (select count(*) + 1 from profits pr where pr.profit > (select profit from profits where user_id = p_user))::int end,
    'rating', rating,
    'tier', case when rating is null then null when rating >= 75 then 'gold' when rating >= 60 then 'silver' else 'bronze' end,
    'attrs', jsonb_build_object('acc', acc, 'frm', frm, 'str', str, 'exp', exp, 'win', win, 'fan', fan))
  from rated;
$$;
