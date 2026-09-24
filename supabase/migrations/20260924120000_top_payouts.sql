-- Home's "Top rivals": the biggest real wins, one per person, each with the
-- room that paid it. Public, settled rooms only — a private room's winnings
-- never leave it. Returns only public profile fields; no wallet addresses,
-- no transaction data. SECURITY DEFINER because entries' RLS (rightly)
-- hides other people's entries from direct reads.
create or replace function public.top_payouts(p_limit int default 5)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  payout_cents bigint,
  stake_cents bigint,
  room_id uuid,
  prediction text,
  side text,
  pool_total_cents bigint,
  participant_count int,
  home_team text,
  away_team text,
  competition text,
  settled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select distinct on (e.user_id)
      e.user_id as user_id, p.username as username, p.display_name as display_name, p.avatar_url as avatar_url,
      e.payout_cents::bigint as payout_cents, e.amount_cents::bigint as stake_cents,
      r.id as room_id, r.prediction as prediction, e.side as side,
      r.pool_total_cents::bigint as pool_total_cents, r.participant_count::int as participant_count,
      m.home_team as home_team, m.away_team as away_team, m.competition as competition,
      coalesce(r.settled_at, r.resolved_at) as settled_at
    from entries e
    join rooms r on r.id = e.room_id
    join profiles p on p.id = e.user_id
    join matches m on m.id::text = r.match_id
    where e.is_winner
      and e.payout_cents > e.amount_cents
      and r.visibility = 'public'
      and r.status = 'settled'
    order by e.user_id, e.payout_cents - e.amount_cents desc
  ) best
  order by best.payout_cents - best.stake_cents desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

revoke all on function public.top_payouts(int) from public;
grant execute on function public.top_payouts(int) to anon, authenticated;
