-- Founder's call (2026-09-23): the balance is the user's own Dynamic
-- embedded Solana wallet — its devnet USDC, funded from the faucet via the
-- address/QR on the top-bar wallet. No separate Rivaly balance. This removes
-- the internal ledger added by 20260923190000_rivaly_balance (unused: zero
-- rows in both tables when this ran) and keeps what's still right about it:
-- the room and the creator's entry are created together in one function,
-- and entries still can't be inserted directly.
--
-- Stakes don't move money yet. The server checks the wallet holds enough
-- USDC (minus stakes already open in other rooms) before calling these;
-- once the escrow address is wired, each stake becomes an on-chain transfer
-- that the server verifies before the entry exists, and that verification
-- is the real boundary. Settlement/refund functions come back with escrow
-- payouts, since winners will be paid on-chain, not from a ledger.

drop function public.settle_room(uuid, text);
drop function public.refund_room(uuid);
drop function public.claim_test_usdc();
drop function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint);
drop function public.join_room_with_stake(uuid, text, bigint);
drop function public._move_balance(uuid, bigint, text, uuid, uuid);
drop table public.balance_ledger;
drop table public.user_balances;

create function public.create_room_with_stake(
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

  insert into entries (room_id, user_id, side, amount_cents) values (v_room, v_user, p_side, p_stake);
  return query select v_room, v_code;
end;
$$;

create function public.join_room_with_stake(p_room uuid, p_side text, p_amount bigint)
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
  return v_entry;
end;
$$;

revoke execute on function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint) from public, anon;
revoke execute on function public.join_room_with_stake(uuid, text, bigint) from public, anon;
grant execute on function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint) to authenticated;
grant execute on function public.join_room_with_stake(uuid, text, bigint) to authenticated;
