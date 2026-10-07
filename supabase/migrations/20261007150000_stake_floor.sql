-- $1 is the smallest stake anywhere on Rivaly (MIN_STAKE_FLOOR_CENTS). The app
-- and server enforce it; this is the database's own backstop. Insert-only
-- triggers, not CHECK constraints: most existing rooms store a 1-cent minimum
-- (the old "No limit" default) and a check would block their later status
-- updates and payouts.
create or replace function public.enforce_stake_floor() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'entries' and new.amount_cents < 100 then
    raise exception 'stake_below_minimum' using errcode = 'check_violation';
  end if;
  if tg_table_name = 'rooms' and new.min_stake_cents < 100 then
    raise exception 'stake_below_minimum' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists entries_stake_floor on public.entries;
create trigger entries_stake_floor before insert on public.entries for each row execute function public.enforce_stake_floor();
drop trigger if exists rooms_stake_floor on public.rooms;
create trigger rooms_stake_floor before insert on public.rooms for each row execute function public.enforce_stake_floor();
