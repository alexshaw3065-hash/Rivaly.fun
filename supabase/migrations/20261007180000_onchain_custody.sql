-- On-chain escrow, phase 3 (docs/plans/onchain-escrow.md): every room
-- records who holds its stakes — the escrow wallet ('wallet', every room so
-- far) or the rivaly_rooms program ('program'). It's decided when the room
-- is created and never changes, so a room always finishes the way it started.

alter table public.rooms
  add column if not exists custody text not null default 'wallet'
  check (custody in ('wallet', 'program'));

-- Which custody new rooms get. Admins-only is the test mode: only rooms an
-- admin creates use the program.
insert into public.feature_flags (key, enabled, description) values
  ('onchain_escrow_admins', false, 'Test mode: new rooms created by admins hold their stakes in the on-chain program instead of the escrow wallet.'),
  ('onchain_escrow', false, 'New rooms (everyone''s) hold their stakes in the on-chain program instead of the escrow wallet. Open rooms finish the way they started.')
on conflict (key) do nothing;

-- Program rooms: the vault is keyed by the room id and the fee rates are
-- frozen on-chain by the first stake, so the server picks both before the
-- stake and the row must record exactly those. Wallet rooms are unchanged
-- (new id, fees from platform_settings via rooms_set_fees).
drop function if exists public.create_room_with_stake(uuid, text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint, text);

create or replace function public.create_room_with_stake(
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
  p_stake_tx text,
  p_room_id uuid default null,
  p_custody text default 'wallet',
  p_fee_bps integer default null,
  p_host_fee_bps integer default null
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
  if p_custody not in ('wallet', 'program') then raise exception 'bad_request'; end if;
  if p_custody = 'program' and (p_room_id is null or p_fee_bps is null or p_host_fee_bps is null) then
    raise exception 'bad_request';
  end if;
  if p_min_stake < 1 or (p_max_stake is not null and p_max_stake < p_min_stake) then raise exception 'bad_limits'; end if;
  if p_stake < p_min_stake or (p_max_stake is not null and p_stake > p_max_stake) then raise exception 'stake_out_of_range'; end if;

  select kickoff_at, status into v_kickoff, v_match_status from matches where id::text = p_match_id;
  if not found then raise exception 'match_not_found'; end if;
  if v_match_status <> 'scheduled' or v_kickoff <= now() then raise exception 'stakes_closed'; end if;

  for attempt in 1..8 loop
    v_code := 'RIVAL-' || (
      select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '')
      from generate_series(1, 6)
    );
    begin
      insert into rooms (
        id, creator_id, match_id, prediction, entry_amount_cents, min_stake_cents, max_stake_cents,
        visibility, allow_spectators, resolution_source, invite_code,
        market_type, market_line, market_side_definition, settlement_mode, custody
      ) values (
        coalesce(p_room_id, gen_random_uuid()), p_user, p_match_id, p_prediction, p_min_stake, p_min_stake, p_max_stake,
        p_visibility, p_visibility = 'public' and p_allow_spectators, p_resolution_source, v_code,
        p_market_type, p_market_line, p_market_side_definition, p_settlement_mode, p_custody
      ) returning id into v_room;
      exit;
    exception when unique_violation then
      if attempt = 8 then raise; end if;
    end;
  end loop;

  -- The rates the chain froze, not today's settings (rooms_set_fees ran on insert).
  if p_custody = 'program' then
    update rooms set fee_bps = p_fee_bps, host_fee_bps = p_host_fee_bps where id = v_room;
  end if;

  insert into entries (room_id, user_id, side, amount_cents, stake_tx_signature)
    values (v_room, p_user, p_side, p_stake, p_stake_tx);
  return query select v_room, v_code;
end;
$$;

revoke all on function public.create_room_with_stake(uuid, text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_room_with_stake(uuid, text, text, text, numeric, jsonb, text, text, text, boolean, bigint, bigint, text, bigint, text, uuid, text, integer, integer) to service_role;
