-- Fees and host earnings (founder decision 2026-09-27; overrides the V1
-- scope's "creator monetization is V2").
--
--   · 5% of the winners' PROFIT (the losing side's money they take) — never
--     of a stake: 3% to Rivaly, 2% to the room's host. Refunds pay nothing.
--     Maths: src/lib/settlement/payouts.ts planSettlement (tested).
--   · A room's rates are fixed when it's created (rooms.fee_bps /
--     host_fee_bps), so changing the rates never touches an existing room.
--   · Off until Rivaly's fee wallet is set: with platform_settings.fee_wallet
--     null, new rooms are created with 0/0 and nothing changes for anyone.
--   · Fees are paid in the same on-chain payout run as the winnings, to
--     Rivaly's fee wallet and the host's wallet, each recorded in room_fees
--     with its Solana signature.
--   · Host earnings are private by default (profiles.show_host_earnings).

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  -- Rivaly's fee wallet (a public Solana address). Null = fees off.
  fee_wallet text,
  rivaly_fee_bps integer not null default 300 check (rivaly_fee_bps between 0 and 2500),
  host_fee_bps integer not null default 200 check (host_fee_bps between 0 and 2500),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings for select using (true);

alter table public.rooms add column if not exists fee_bps integer not null default 0 check (fee_bps between 0 and 2500);
alter table public.rooms add column if not exists host_fee_bps integer not null default 0 check (host_fee_bps between 0 and 2500);
-- Who actually gets paid, frozen by the first settlement run so a retry can
-- never pay a different split: {rivalyBps, hostBps, rivalyWallet, hostWallet}.
alter table public.rooms add column if not exists fee_plan jsonb;

-- Whatever a client sends, a new room gets today's rates — or none while fees are off.
create or replace function public.rooms_set_fees()
returns trigger language plpgsql security definer set search_path = public as $$
declare s platform_settings%rowtype;
begin
  select * into s from platform_settings where id;
  if found and s.fee_wallet is not null then
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
drop trigger if exists rooms_set_fees on public.rooms;
create trigger rooms_set_fees before insert on public.rooms for each row execute function public.rooms_set_fees();
revoke execute on function public.rooms_set_fees() from public, anon, authenticated;

create table if not exists public.room_fees (
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null check (kind in ('rivaly', 'host')),
  recipient_id uuid references public.profiles(id) on delete set null,
  wallet text not null,
  cents bigint not null check (cents > 0),
  payout_tx_signature text,
  payout_valid_until_height bigint,
  created_at timestamptz not null default now(),
  primary key (room_id, kind)
);
create index if not exists room_fees_recipient_idx on public.room_fees (recipient_id, created_at desc);
alter table public.room_fees enable row level security;
-- A host sees their own earnings; nobody reads anyone else's.
drop policy if exists room_fees_select_own on public.room_fees;
create policy room_fees_select_own on public.room_fees for select using (recipient_id = (select auth.uid()));

alter table public.profiles add column if not exists show_host_earnings boolean not null default false;

-- Someone you follow opened a room.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'joined', 'big_stake', 'faded', 'kickoff', 'won', 'lost', 'refunded', 'reply', 'mention', 'follow', 'league_join', 'creator_room'));

create or replace function public.notify_on_room_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility = 'public' then
    insert into notifications (user_id, kind, actor_id, room_id, data)
    select f.follower_id, 'creator_room', new.creator_id, new.id, jsonb_build_object('prediction', new.prediction)
    from follows f where f.following_id = new.creator_id;
  end if;
  return new;
exception when others then
  raise warning 'notify_on_room_created failed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists rooms_notify_created on public.rooms;
create trigger rooms_notify_created after insert on public.rooms for each row execute function public.notify_on_room_created();
revoke execute on function public.notify_on_room_created() from public, anon, authenticated;

-- Host stats for a profile: always the counts; earnings only if the host
-- chose to show them (or it's you).
create or replace function public.host_stats(p_profile uuid)
returns table(rooms_hosted int, pot_hosted_cents bigint, earnings_cents bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from rooms r where r.creator_id = p_profile and r.status <> 'cancelled'),
    (select coalesce(sum(r.pool_total_cents), 0)::bigint from rooms r where r.creator_id = p_profile and r.status <> 'cancelled'),
    case when p_profile = auth.uid() or (select show_host_earnings from profiles where id = p_profile)
      then (select coalesce(sum(f.cents), 0)::bigint from room_fees f where f.recipient_id = p_profile and f.kind = 'host' and f.payout_tx_signature is not null)
    end;
$$;
grant execute on function public.host_stats(uuid) to anon, authenticated;
