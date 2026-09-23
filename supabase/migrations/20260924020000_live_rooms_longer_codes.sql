-- Live rooms + longer invite codes.
--
-- Realtime: rooms and entries join the publication (matches, match_events
-- and messages already are), so an open room updates the instant a rival
-- joins, stakes lock at kickoff, or settlement decides it — no polling.
-- Postgres-changes delivery respects RLS, so a private room's changes only
-- reach its creator and entrants.
alter publication supabase_realtime add table public.rooms, public.entries;

-- Invite codes: 6 characters (32^6 ≈ 1.07 billion combinations, up from
-- ~1 million at 4) so a private room can't be found by guessing. Existing
-- 4-character codes keep working — only new rooms get the longer form.
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
      from generate_series(1, 6)
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

