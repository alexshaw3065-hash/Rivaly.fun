-- Create-room rework: the creator now sets room rules (stake limits,
-- spectators) and picks their own side and stake, instead of every entry
-- being one fixed amount on an implicit "Yes".
--
-- Stake limits: min_stake_cents is required, max_stake_cents null = no
-- upper limit. Every existing room is backfilled to min = max = its old
-- fixed entry_amount_cents, so nothing about how those rooms accept entries
-- changes. entry_amount_cents stays (the room card and JoinPanel read it);
-- new rooms write their min stake there, which is always a valid entry.
alter table public.rooms
  add column min_stake_cents bigint,
  add column max_stake_cents bigint,
  add column allow_spectators boolean not null default true;

update public.rooms set min_stake_cents = entry_amount_cents, max_stake_cents = entry_amount_cents;

alter table public.rooms
  alter column min_stake_cents set not null,
  add constraint rooms_min_stake_positive check (min_stake_cents > 0),
  add constraint rooms_stake_range check (max_stake_cents is null or max_stake_cents >= min_stake_cents);

-- Entries: any amount inside the room's limits, replacing the exact-match
-- check against entry_amount_cents.
drop policy "entries_insert_self" on public.entries;
create policy "entries_insert_self" on public.entries for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.rooms r
      where r.id = entries.room_id
        and r.status = 'open'
        and entries.amount_cents >= r.min_stake_cents
        and (r.max_stake_cents is null or entries.amount_cents <= r.max_stake_cents)
    )
  );

-- Spectators: a public room's chat is readable (and, as before, postable)
-- by anyone only while allow_spectators is on. Off = creator and entrants
-- only. Default true keeps every existing room exactly as it was.
drop policy messages_select on public.messages;
create policy messages_select on public.messages
  for select
  using (
    exists (select 1 from public.rooms r where r.id = messages.room_id and r.visibility = 'public' and r.allow_spectators)
    or exists (select 1 from public.rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid()))
    or public.room_has_participant(room_id, (select auth.uid()))
  );

drop policy messages_insert_self on public.messages;
create policy messages_insert_self on public.messages
  for insert
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.rooms r where r.id = messages.room_id and r.visibility = 'public' and r.allow_spectators)
      or exists (select 1 from public.rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid()))
      or public.room_has_participant(room_id, (select auth.uid()))
    )
  );

-- Three more market types the new picker offers: half-time exact score
-- (home_score_ht/away_score_ht), second-half goals over/under (full-time
-- total minus the HT total — no new columns), and anytime goalscorer.
alter table public.rooms drop constraint rooms_market_type_check;
alter table public.rooms add constraint rooms_market_type_check
  check (market_type in (
    'winner', 'total_goals', 'both_score', 'correct_score', 'handicap',
    'halftime_result', 'halftime_total_goals', 'halftime_correct_score', 'second_half_total_goals',
    'corners', 'cards', 'penalty', 'red_card', 'var', 'anytime_scorer',
    'custom'
  ));
