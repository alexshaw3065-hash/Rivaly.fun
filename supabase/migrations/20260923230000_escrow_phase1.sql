-- Escrow build, phase 1 — see docs/plans/escrow-wallet-build.md.
-- Additive except the two functions, which gain the kickoff lock.

-- Red cards as the feed counts them (the count drops back when VAR rescinds
-- a red; the red_card event doesn't) — what the red-card market settles on.
alter table public.matches
  add column home_red_cards integer,
  add column away_red_cards integer;

-- Every stake will be an on-chain transfer into escrow; its signature is the
-- receipt, and unique so one transfer can never back two entries. Payouts
-- and refunds record theirs, so a re-run settlement can see what's paid.
alter table public.entries
  add column stake_tx_signature text unique,
  add column payout_tx_signature text;

-- Settlement state. pending_* is the 10-minute safety window: the first time
-- a result is seen locked, and what it was. resolved_outcome is final.
alter table public.rooms
  add column resolved_outcome text check (resolved_outcome in ('yes', 'no', 'void')),
  add column pending_outcome text check (pending_outcome in ('yes', 'no')),
  add column pending_since timestamptz,
  add column resolved_at timestamptz;

-- A stake from "prepared" (server built the transaction) to "completed"
-- (on-chain + entry written). Server-only: RLS on, no policies — the money
-- path reads and writes it with the service role, nothing else can.
create table public.stake_intents (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  kind                   text not null check (kind in ('create', 'join')),
  room_id                uuid references public.rooms(id) on delete set null,
  payload                jsonb not null,
  side                   text not null check (side in ('yes', 'no')),
  amount_cents           bigint not null check (amount_cents > 0),
  wallet_address         text not null,
  message_base64         text not null,
  last_valid_block_height bigint not null,
  status                 text not null default 'prepared'
                           check (status in ('prepared', 'submitted', 'completed', 'failed', 'expired')),
  tx_signature           text unique,
  error                  text,
  created_at             timestamptz not null default now(),
  expires_at             timestamptz not null default now() + interval '2 minutes'
);
create index stake_intents_user_idx on public.stake_intents (user_id, created_at desc);
create index stake_intents_status_idx on public.stake_intents (status) where status in ('prepared', 'submitted');
alter table public.stake_intents enable row level security;

-- Stakes close at kickoff (founder's call): after it, someone could back
-- "Over 2.5" already knowing it's 2-0. Enforced here, where the entry is
-- written, not just in the UI.
create or replace function public.create_room_with_stake(
  p_match_id text,
  p_prediction text,
  p_market_type text,
  p_market_line numeric,
  p_market_side_definition jsonb,
  p_settlement_mode text,
  p_resolution_source text,
  p_visibility text,
  p_allow_spectators boolean,
  p_min_stake bigint,
  p_max_stake bigint,
  p_side text,
  p_stake bigint
) returns table (room_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_room uuid;
  v_kickoff timestamptz;
  v_match_status text;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_side not in ('yes', 'no') then raise exception 'bad_side'; end if;
  if p_min_stake < 1 or (p_max_stake is not null and p_max_stake < p_min_stake) then raise exception 'bad_limits'; end if;
  if p_stake < p_min_stake or (p_max_stake is not null and p_stake > p_max_stake) then raise exception 'stake_out_of_range'; end if;

  select kickoff_at, status into v_kickoff, v_match_status from matches where id::text = p_match_id;
  if not found then raise exception 'match_not_found'; end if;
  if v_match_status <> 'scheduled' or v_kickoff <= now() then raise exception 'stakes_closed'; end if;

  for attempt in 1..8 loop
    v_code := 'RIVAL-' || (
      select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '')
      from generate_series(1, 4)
    );
    begin
      insert into rooms (
        creator_id, match_id, prediction, entry_amount_cents, min_stake_cents, max_stake_cents,
        visibility, allow_spectators, resolution_source, invite_code,
        market_type, market_line, market_side_definition, settlement_mode
      ) values (
        v_user, p_match_id, p_prediction, p_min_stake, p_min_stake, p_max_stake,
        p_visibility, p_visibility = 'public' and p_allow_spectators, p_resolution_source, v_code,
        p_market_type, p_market_line, p_market_side_definition, p_settlement_mode
      ) returning id into v_room;
      exit;
    exception when unique_violation then
      if attempt = 8 then raise; end if;
    end;
  end loop;

  insert into entries (room_id, user_id, side, amount_cents) values (v_room, v_user, p_side, p_stake);
  return query select v_room, v_code;
end;
$$;

create or replace function public.join_room_with_stake(p_room uuid, p_side text, p_amount bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room rooms%rowtype;
  v_entry uuid;
  v_kickoff timestamptz;
  v_match_status text;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_side not in ('yes', 'no') then raise exception 'bad_side'; end if;
  select * into v_room from rooms where id = p_room for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.status <> 'open' then raise exception 'room_closed'; end if;

  select kickoff_at, status into v_kickoff, v_match_status from matches where id::text = v_room.match_id;
  if not found or v_match_status <> 'scheduled' or v_kickoff <= now() then raise exception 'stakes_closed'; end if;

  if p_amount < v_room.min_stake_cents or (v_room.max_stake_cents is not null and p_amount > v_room.max_stake_cents) then
    raise exception 'stake_out_of_range';
  end if;
  begin
    insert into entries (room_id, user_id, side, amount_cents)
      values (p_room, v_user, p_side, p_amount)
      returning id into v_entry;
  exception when unique_violation then
    raise exception 'already_joined';
  end;
  return v_entry;
end;
$$;
