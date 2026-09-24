-- The other two groups in Home's rivals row, alongside top_payouts():
--   top_streaks  — "Goated": current consecutive wins (3+), newest first
--   top_earners  — "Hall of fame": all-time net profit across rooms
-- Same rules as top_payouts: public, settled rooms only; public profile
-- fields only; SECURITY DEFINER because entries' RLS hides other people's rows.

create or replace function public.top_streaks(p_limit int default 5)
returns table (user_id uuid, username text, display_name text, avatar_url text, streak int)
language sql
stable
security definer
set search_path = public
as $$
  with results as (
    select e.user_id, e.is_winner, coalesce(r.settled_at, r.resolved_at, r.created_at) as at
    from entries e
    join rooms r on r.id = e.room_id
    where r.status = 'settled' and r.visibility = 'public' and e.is_winner is not null
  ),
  ordered as (
    select user_id, is_winner,
      -- losses seen so far, newest result first: the streak is every result before the first loss
      sum(case when is_winner then 0 else 1 end) over (partition by user_id order by at desc rows between unbounded preceding and current row) as losses_before
    from results
  ),
  streaks as (
    select user_id, count(*)::int as streak from ordered where losses_before = 0 group by user_id
  )
  select s.user_id, p.username, p.display_name, p.avatar_url, s.streak
  from streaks s
  join profiles p on p.id = s.user_id
  where s.streak >= 3
  order by s.streak desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

create or replace function public.top_earners(p_limit int default 5)
returns table (user_id uuid, username text, display_name text, avatar_url text, profit_cents bigint, rooms_won int)
language sql
stable
security definer
set search_path = public
as $$
  select e.user_id, p.username, p.display_name, p.avatar_url,
    sum(coalesce(e.payout_cents, 0) - e.amount_cents)::bigint as profit_cents,
    count(*) filter (where e.is_winner)::int as rooms_won
  from entries e
  join rooms r on r.id = e.room_id
  join profiles p on p.id = e.user_id
  where r.status = 'settled' and r.visibility = 'public'
  group by e.user_id, p.username, p.display_name, p.avatar_url
  having sum(coalesce(e.payout_cents, 0) - e.amount_cents) > 0
  order by profit_cents desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

revoke all on function public.top_streaks(int) from public;
revoke all on function public.top_earners(int) from public;
grant execute on function public.top_streaks(int) to anon, authenticated;
grant execute on function public.top_earners(int) to anon, authenticated;
