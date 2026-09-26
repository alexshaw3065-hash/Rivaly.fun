-- The Leaderboard, one row of metrics plus a period picker:
--   metric: profit | points | accuracy | streak
--   period: today | week (the Tue–Mon gameweek) | month | all
-- Replaces the Everyone/People-you-follow switch: every row now says whether
-- you follow that person, and your own row always comes back (with its rank)
-- even when you're outside the top 50, so the app can pin it. Public rooms
-- only, as before. A streak is always the current run, whatever the period.

drop function if exists public.arena_leaderboard(text, text);

create function public.arena_leaderboard(p_metric text default 'profit', p_period text default 'all')
returns table (user_id uuid, username text, display_name text, avatar_url text, value numeric, played int, rank int, is_me boolean, following boolean)
language sql
stable
security definer
set search_path = public
as $$
  with since as (
    select case p_period
      when 'today' then date_trunc('day', now())
      when 'week' then public.gameweek_start()
      when 'month' then date_trunc('month', now())
      else '-infinity'::timestamptz
    end as t
  ),
  res as (
    select r.* from public.arena_results() r, since
    where r.is_public and (p_metric = 'streak' or r.at >= since.t)
  ),
  ordered as (
    select res.*, sum(case when res.won then 0 else 1 end)
      over (partition by res.user_id order by res.at desc rows between unbounded preceding and current row) as losses_before
    from res
  ),
  agg as (
    select res.user_id,
      sum(res.profit_cents) as profit,
      sum(res.points) as points,
      count(*) filter (where res.won)::numeric / nullif(count(*), 0) as accuracy,
      count(*)::int as played
    from res group by res.user_id
  ),
  streaks as (
    select o.user_id, count(*) as streak from ordered o where o.losses_before = 0 group by o.user_id
  ),
  scored as (
    select a.user_id, a.played,
      case p_metric
        when 'points' then a.points
        when 'accuracy' then round(a.accuracy * 100)
        when 'streak' then coalesce(s.streak, 0)
        else a.profit
      end::numeric as value
    from agg a
    left join streaks s on s.user_id = a.user_id
    where case p_metric
        when 'accuracy' then a.played >= 3
        when 'streak' then coalesce(s.streak, 0) >= 2
        when 'points' then a.points > 0
        else true
      end
  ),
  ranked as (
    select sc.*, (rank() over (order by sc.value desc, sc.played desc))::int as rnk from scored sc
  )
  select p.id, p.username, p.display_name, p.avatar_url, rk.value, rk.played, rk.rnk,
    p.id = auth.uid(),
    exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = p.id)
  from ranked rk
  join profiles p on p.id = rk.user_id
  where rk.rnk <= 50 or p.id = auth.uid()
  order by rk.rnk, p.display_name;
$$;
grant execute on function public.arena_leaderboard(text, text) to anon, authenticated;
