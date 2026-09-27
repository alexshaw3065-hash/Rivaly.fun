-- Who brings people in: signups whose first touch was someone's ?ref= link
-- (share links carry ?ref=<username> — src/lib/referral.ts).
create or replace function public.admin_referrals(p_days int default 90)
returns table(referrer_id uuid, referrer_username text, signups int, wallets int, stakers int, volume_cents bigint)
language sql stable security definer set search_path = public as $$
  select r.id, p.acquisition->>'source', count(*)::int,
    count(*) filter (where p.dynamic_wallet_address is not null)::int,
    count(*) filter (where exists (select 1 from entries e where e.user_id = p.id))::int,
    coalesce(sum((select coalesce(sum(e.amount_cents), 0) from entries e where e.user_id = p.id)), 0)::bigint
  from profiles p
  left join profiles r on lower(r.username) = lower(p.acquisition->>'source')
  where p.acquisition->>'medium' = 'referral' and p.created_at > now() - make_interval(days => greatest(p_days, 1))
  group by r.id, p.acquisition->>'source'
  order by 3 desc;
$$;
revoke execute on function public.admin_referrals(int) from public, anon, authenticated;
