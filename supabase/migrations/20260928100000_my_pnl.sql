-- Your own profit/loss over time, for the chart on your profile: one row per
-- room you were in that has settled, when it settled and what it made or lost
-- you (the same per-room profit arena_results feeds into Winnings and the
-- leaderboards). Private rooms included — it's your own money; nobody else
-- can read it (auth.uid() only).
create or replace function public.my_pnl()
returns table (at timestamptz, profit_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.at, r.profit_cents
  from public.arena_results() r
  where r.user_id = auth.uid()
    and r.at is not null
  order by r.at;
$$;

revoke all on function public.my_pnl() from public, anon;
grant execute on function public.my_pnl() to authenticated;
