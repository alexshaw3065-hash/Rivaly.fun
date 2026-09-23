-- Rivaly balance: deposit once, stake instantly. See
-- docs/plans/fast-deposit-and-create.md.
--
-- Both tables are written only by the SECURITY DEFINER functions below —
-- the browser can read its own rows, never write them — and every money
-- movement is one row-locked transaction, so a double-tap or two tabs
-- racing can't spend the same dollar twice.

create table public.user_balances (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  updated_at    timestamptz not null default now()
);

create table public.balance_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  delta_cents bigint not null check (delta_cents <> 0),
  kind        text not null check (kind in ('faucet', 'deposit', 'withdrawal', 'stake', 'payout', 'refund')),
  room_id     uuid references public.rooms(id) on delete set null,
  entry_id    uuid references public.entries(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index balance_ledger_user_idx on public.balance_ledger (user_id, created_at desc);
create index balance_ledger_room_idx on public.balance_ledger (room_id);

alter table public.user_balances enable row level security;
alter table public.balance_ledger enable row level security;

create policy user_balances_select_own on public.user_balances
  for select using (user_id = (select auth.uid()));
create policy balance_ledger_select_own on public.balance_ledger
  for select using (user_id = (select auth.uid()));

-- Internal: apply one signed movement to a user's balance and log it. Not
-- callable by clients (revoked below) — only the functions that also do the
-- thing the money is for.
create or replace function public._move_balance(
  p_user uuid, p_delta bigint, p_kind text, p_room uuid default null, p_entry uuid default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
begin
  insert into user_balances (user_id) values (p_user) on conflict (user_id) do nothing;
  select balance_cents into v_balance from user_balances where user_id = p_user for update;
  if v_balance + p_delta < 0 then
    raise exception 'insufficient_balance';
  end if;
  update user_balances set balance_cents = v_balance + p_delta, updated_at = now() where user_id = p_user;
  insert into balance_ledger (user_id, delta_cents, kind, room_id, entry_id)
    values (p_user, p_delta, p_kind, p_room, p_entry);
  return v_balance + p_delta;
end;
$$;

-- Devnet test money: +$100 whenever the balance is under $100, so anyone
-- who wants to try a room is one tap away from being able to.
create or replace function public.claim_test_usdc()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance bigint;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  insert into user_balances (user_id) values (v_user) on conflict (user_id) do nothing;
  select balance_cents into v_balance from user_balances where user_id = v_user for update;
  if v_balance >= 10000 then raise exception 'balance_high'; end if;
  return _move_balance(v_user, 10000, 'faucet');
end;
$$;

-- The room, the creator's entry and the stake debit happen together or not
-- at all. The market's prediction/definition are composed server-side in
-- TypeScript (src/lib/markets.ts) and passed in; this function owns the
-- money and the invariants.
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
  v_entry uuid;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_side not in ('yes', 'no') then raise exception 'bad_side'; end if;
  if p_min_stake < 1 or (p_max_stake is not null and p_max_stake < p_min_stake) then raise exception 'bad_limits'; end if;
  if p_stake < p_min_stake or (p_max_stake is not null and p_stake > p_max_stake) then raise exception 'stake_out_of_range'; end if;

  -- invite_code is unique; retry the rare collision rather than failing.
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

  insert into entries (room_id, user_id, side, amount_cents)
    values (v_room, v_user, p_side, p_stake)
    returning id into v_entry;
  perform _move_balance(v_user, -p_stake, 'stake', v_room, v_entry);

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
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_side not in ('yes', 'no') then raise exception 'bad_side'; end if;
  select * into v_room from rooms where id = p_room for update;
  if not found then raise exception 'room_not_found'; end if;
  -- Private rooms are joined by code; the code lookup is what makes the
  -- room visible, so here it's enough that the room exists and is open.
  if v_room.status <> 'open' then raise exception 'room_closed'; end if;
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
  perform _move_balance(v_user, -p_amount, 'stake', p_room, v_entry);
  return v_entry;
end;
$$;

-- Service role only (the settlement job): every stake back — postponed or
-- cancelled matches, or a room nobody backed the winning side of.
create or replace function public.refund_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  e record;
begin
  select status into v_status from rooms where id = p_room for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_status in ('settled', 'refunded') then raise exception 'already_final'; end if;
  for e in select id, user_id, amount_cents from entries where room_id = p_room loop
    update entries set is_winner = null, payout_cents = e.amount_cents where id = e.id;
    perform _move_balance(e.user_id, e.amount_cents, 'refund', p_room, e.id);
  end loop;
  update rooms set status = 'refunded', settled_at = now() where id = p_room;
end;
$$;

-- Service role only (the settlement job). Winners split the whole pool pro
-- rata to what they staked — no fee, Rivaly takes nothing. Integer cents
-- are floored per winner and the leftover cent or two goes to the largest
-- winning stake, so every cent of the pool is paid out. If nobody backed
-- the winning side there's no one to pay: everyone gets their stake back.
create or replace function public.settle_room(p_room uuid, p_winning_side text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pool bigint;
  v_winning bigint;
  v_paid bigint := 0;
  v_payout bigint;
  v_top uuid;
  e record;
begin
  if p_winning_side not in ('yes', 'no') then raise exception 'bad_side'; end if;
  select status into v_status from rooms where id = p_room for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_status in ('settled', 'refunded') then raise exception 'already_final'; end if;

  select coalesce(sum(amount_cents), 0),
         coalesce(sum(amount_cents) filter (where side = p_winning_side), 0)
    into v_pool, v_winning
    from entries where room_id = p_room;

  if v_winning = 0 then
    perform refund_room(p_room);
    return;
  end if;

  select id into v_top from entries
    where room_id = p_room and side = p_winning_side
    order by amount_cents desc, created_at asc limit 1;

  update entries set is_winner = false, payout_cents = 0
    where room_id = p_room and side <> p_winning_side;

  for e in select id, user_id, amount_cents from entries where room_id = p_room and side = p_winning_side loop
    v_payout := floor(e.amount_cents::numeric * v_pool / v_winning)::bigint;
    v_paid := v_paid + v_payout;
    update entries set is_winner = true, payout_cents = v_payout where id = e.id;
  end loop;

  -- Rounding dust to the largest winning stake, then pay everyone.
  update entries set payout_cents = payout_cents + (v_pool - v_paid) where id = v_top;
  for e in select id, user_id, payout_cents from entries where room_id = p_room and side = p_winning_side loop
    perform _move_balance(e.user_id, e.payout_cents, 'payout', p_room, e.id);
  end loop;

  update rooms set status = 'settled', settled_at = now() where id = p_room;
end;
$$;

revoke execute on function public._move_balance(uuid, bigint, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.settle_room(uuid, text) from public, anon, authenticated;
revoke execute on function public.refund_room(uuid) from public, anon, authenticated;
grant execute on function public.settle_room(uuid, text) to service_role;
grant execute on function public.refund_room(uuid) to service_role;

revoke execute on function public.claim_test_usdc() from public, anon;
revoke execute on function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint) from public, anon;
revoke execute on function public.join_room_with_stake(uuid, text, bigint) from public, anon;
grant execute on function public.claim_test_usdc() to authenticated;
grant execute on function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint) to authenticated;
grant execute on function public.join_room_with_stake(uuid, text, bigint) to authenticated;

-- Private rooms are invisible to non-members under rooms_select, so an
-- invite code alone couldn't open one. Holding the code is the permission:
-- this returns the room to anyone who has it (and only that room).
create or replace function public.room_by_invite_code(p_code text)
returns setof public.rooms
language sql
security definer
stable
set search_path = public
as $$
  select * from rooms where upper(invite_code) = upper(trim(p_code)) limit 1;
$$;
revoke execute on function public.room_by_invite_code(text) from public;
grant execute on function public.room_by_invite_code(text) to anon, authenticated;

-- A stake can now only exist through a function that also moved the money.
drop policy "entries_insert_self" on public.entries;
drop policy "rooms_insert_self" on public.rooms;
