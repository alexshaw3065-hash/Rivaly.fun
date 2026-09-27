-- Host fees become a claimable balance (founder decision 2026-09-27):
-- instead of paying each room's fee on-chain at settlement, it's recorded;
-- hosts see Pending (live rooms) → Claimable (settled) and claim everything
-- in one transfer ($1 minimum). Rivaly's 3% accrues in escrow the same way,
-- withdrawn later from the admin page to platform_settings.fee_wallet.
--
-- Fees are switched on by platform_settings.fees_enabled (the fee wallet is
-- now only where Rivaly's withdrawals go, not a precondition).

alter table public.platform_settings add column if not exists fees_enabled boolean not null default false;

create or replace function public.rooms_set_fees()
returns trigger language plpgsql security definer set search_path = public as $$
declare s platform_settings%rowtype;
begin
  select * into s from platform_settings where id;
  if found and s.fees_enabled then
    new.fee_bps := s.rivaly_fee_bps;
    new.host_fee_bps := s.host_fee_bps;
  else
    new.fee_bps := 0;
    new.host_fee_bps := 0;
  end if;
  new.fee_plan := null;
  return new;
end;
$$;

-- A claim: one transfer of a host's whole claimable balance (or, later, a
-- withdrawal of Rivaly's). Written before anything is signed, so a crash
-- mid-send is recovered by the settlement cron: landed → confirmed; expired
-- or failed → released back to claimable.
create table if not exists public.fee_claims (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('host', 'rivaly')),
  user_id uuid references public.profiles(id) on delete set null,
  wallet text not null,
  cents bigint not null check (cents > 0),
  status text not null default 'pending' check (status in ('pending', 'sent', 'confirmed', 'failed')),
  payout_tx_signature text,
  payout_valid_until_height bigint,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
-- One claim in flight per host at a time.
create unique index if not exists fee_claims_one_open on public.fee_claims (user_id) where status in ('pending', 'sent') and kind = 'host';
create index if not exists fee_claims_user_idx on public.fee_claims (user_id, created_at desc);
alter table public.fee_claims enable row level security;
drop policy if exists fee_claims_select_own on public.fee_claims;
create policy fee_claims_select_own on public.fee_claims for select using (user_id = (select auth.uid()));

-- room_fees is now a ledger, not a payout: no wallet or signature per row.
alter table public.room_fees drop column if exists payout_tx_signature;
alter table public.room_fees drop column if exists payout_valid_until_height;
alter table public.room_fees drop column if exists wallet;
alter table public.room_fees add column if not exists claim_id uuid references public.fee_claims(id) on delete set null;
create index if not exists room_fees_unclaimed_idx on public.room_fees (recipient_id) where claim_id is null;

/**
 * Start a host's claim: every unclaimed host fee is attached to one new
 * claim row, in one transaction. Service role only (the claim action calls
 * it after checking who's signed in). Refuses under the minimum, and while
 * another claim of theirs is still in flight.
 */
create or replace function public.start_host_claim(p_user uuid, p_wallet text, p_min_cents bigint default 100)
returns table(claim_id uuid, cents bigint)
language plpgsql security definer set search_path = public as $$
declare
  total bigint;
  cid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('host_claim:' || p_user::text));
  if exists (select 1 from fee_claims where user_id = p_user and kind = 'host' and status in ('pending', 'sent')) then
    raise exception 'claim_in_progress';
  end if;
  select coalesce(sum(f.cents), 0) into total
  from room_fees f
  left join fee_claims c on c.id = f.claim_id
  where f.recipient_id = p_user and f.kind = 'host' and (f.claim_id is null or c.status = 'failed');
  if total < p_min_cents then raise exception 'below_minimum'; end if;
  insert into fee_claims (kind, user_id, wallet, cents) values ('host', p_user, p_wallet, total) returning id into cid;
  update room_fees f set claim_id = cid
  from (select f2.room_id, f2.kind from room_fees f2 left join fee_claims c on c.id = f2.claim_id
        where f2.recipient_id = p_user and f2.kind = 'host' and (f2.claim_id is null or c.status = 'failed')) x
  where f.room_id = x.room_id and f.kind = x.kind;
  return query select cid, total;
end;
$$;
revoke execute on function public.start_host_claim(uuid, text, bigint) from public, anon, authenticated;

-- A host's balance, for the wallet: claimable (settled, unclaimed), being
-- claimed (in flight), claimed (confirmed).
create or replace function public.my_host_balance()
returns table(claimable_cents bigint, in_flight_cents bigint, claimed_cents bigint)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(f.cents) filter (where f.claim_id is null or c.status = 'failed'), 0)::bigint,
    coalesce(sum(f.cents) filter (where c.status in ('pending', 'sent')), 0)::bigint,
    coalesce(sum(f.cents) filter (where c.status = 'confirmed'), 0)::bigint
  from room_fees f
  left join fee_claims c on c.id = f.claim_id
  where f.recipient_id = auth.uid() and f.kind = 'host';
$$;
grant execute on function public.my_host_balance() to authenticated;

-- Profile host stats: earnings = everything earned hosting (claimed or not).
create or replace function public.host_stats(p_profile uuid)
returns table(rooms_hosted int, pot_hosted_cents bigint, earnings_cents bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from rooms r where r.creator_id = p_profile and r.status <> 'cancelled'),
    (select coalesce(sum(r.pool_total_cents), 0)::bigint from rooms r where r.creator_id = p_profile and r.status <> 'cancelled'),
    case when p_profile = auth.uid() or (select show_host_earnings from profiles where id = p_profile)
      then (select coalesce(sum(f.cents), 0)::bigint from room_fees f where f.recipient_id = p_profile and f.kind = 'host')
    end;
$$;

-- "You earned $0.60 hosting — tap to claim."
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'joined', 'big_stake', 'faded', 'kickoff', 'won', 'lost', 'refunded', 'reply', 'mention', 'follow', 'league_join', 'creator_room', 'host_earned'));

create or replace function public.notify_on_host_fee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'host' and new.recipient_id is not null then
    insert into notifications (user_id, kind, room_id, data)
    select new.recipient_id, 'host_earned', new.room_id, jsonb_build_object('amount', new.cents, 'prediction', r.prediction)
    from rooms r where r.id = new.room_id;
  end if;
  return new;
exception when others then
  raise warning 'notify_on_host_fee failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists room_fees_notify on public.room_fees;
create trigger room_fees_notify after insert on public.room_fees for each row execute function public.notify_on_host_fee();
revoke execute on function public.notify_on_host_fee() from public, anon, authenticated;
