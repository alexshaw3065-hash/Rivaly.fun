-- Escrow build, phase 2 — gasless on-chain stakes. See
-- docs/plans/escrow-wallet-build.md.
--
-- From here an entry may only exist after the server has verified its USDC
-- transfer into escrow on-chain, so the create/join functions stop being
-- callable by signed-in users and take the verified user id and transfer
-- signature from the server (service role) instead.

-- Payout bookkeeping: a payout's signature is known before it's sent, so
-- it's recorded first; valid_until lets a re-run tell "still landing" from
-- "expired, resend" instead of paying twice.
alter table public.entries
  add column payout_valid_until_height bigint;

drop function public.create_room_with_stake(text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint);
drop function public.join_room_with_stake(uuid, text, bigint);

create function public.create_room_with_stake(
  p_user uuid,
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
  p_stake bigint,
  p_stake_tx text
) returns table (room_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_room uuid;
  v_kickoff timestamptz;
  v_match_status text;
begin
  if p_user is null or p_stake_tx is null then raise exception 'bad_request'; end if;
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
        p_user, p_match_id, p_prediction, p_min_stake, p_min_stake, p_max_stake,
        p_visibility, p_visibility = 'public' and p_allow_spectators, p_resolution_source, v_code,
        p_market_type, p_market_line, p_market_side_definition, p_settlement_mode
      ) returning id into v_room;
      exit;
    exception when unique_violation then
      if attempt = 8 then raise; end if;
    end;
  end loop;

  insert into entries (room_id, user_id, side, amount_cents, stake_tx_signature)
    values (v_room, p_user, p_side, p_stake, p_stake_tx);
  return query select v_room, v_code;
end;
$$;

create function public.join_room_with_stake(p_user uuid, p_room uuid, p_side text, p_amount bigint, p_stake_tx text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_entry uuid;
  v_kickoff timestamptz;
  v_match_status text;
begin
  if p_user is null or p_stake_tx is null then raise exception 'bad_request'; end if;
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
    insert into entries (room_id, user_id, side, amount_cents, stake_tx_signature)
      values (p_room, p_user, p_side, p_amount, p_stake_tx)
      returning id into v_entry;
  exception when unique_violation then
    raise exception 'already_joined';
  end;
  return v_entry;
end;
$$;

revoke execute on function public.create_room_with_stake(uuid, text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.join_room_with_stake(uuid, uuid, text, bigint, text) from public, anon, authenticated;
grant execute on function public.create_room_with_stake(uuid, text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint, text) to service_role;
grant execute on function public.join_room_with_stake(uuid, uuid, text, bigint, text) to service_role;

-- Cutover: open rooms from before escrow hold entries with no transfer
-- behind them (no money ever moved), so they can't settle — they're closed
-- as void. Nothing to refund.
update public.rooms r
set status = 'cancelled', resolved_outcome = 'void', resolved_at = now()
where r.status in ('open', 'live')
  and exists (select 1 from public.entries e where e.room_id = r.id and e.stake_tx_signature is null);
