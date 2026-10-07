-- Fix for 20261007150000_stake_floor: PL/pgSQL resolves new.<field> even
-- when the other half of an AND is false, so the shared trigger failed on
-- every insert (rooms have no amount_cents, entries no min_stake_cents) and
-- every stake from 07:02 to 22:11 UTC on 2026-10-07 was refunded. Separate
-- branches per table.
create or replace function public.enforce_stake_floor() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'entries' then
    if new.amount_cents < 100 then
      raise exception 'stake_below_minimum' using errcode = 'check_violation';
    end if;
  elsif tg_table_name = 'rooms' then
    if new.min_stake_cents < 100 then
      raise exception 'stake_below_minimum' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
