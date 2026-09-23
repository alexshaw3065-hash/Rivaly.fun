-- Adds the two market types the create-room plan specified but the first
-- pass didn't ship (correct_score, handicap), and widens 'winner' to a true
-- three-way claim (home/draw/away) rather than the binary home-or-away
-- simplification it launched with. Postgres has no ALTER CHECK, so this
-- drops and recreates the constraint — additive in effect, no existing rows
-- are touched (every current row's market_type is already in the new list).
alter table public.rooms drop constraint rooms_market_type_check;
alter table public.rooms add constraint rooms_market_type_check
  check (market_type in ('winner', 'total_goals', 'both_score', 'correct_score', 'handicap', 'custom'));
