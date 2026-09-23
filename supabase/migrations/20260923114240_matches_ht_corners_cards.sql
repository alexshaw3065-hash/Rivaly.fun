-- Half-time score, corners and yellow cards, extracted from TxLINE's Score
-- object at the HT/Total periods — verified against a real payload during
-- the TxLINE integration (Fulham v Man Utd carried
-- "Total":{"Goals":1,"YellowCards":3,"Corners":3} per participant, with the
-- identical shape at "HT"), not a guess about what the feed provides.
-- Nullable: unpopulated until the ingester writes them, same as
-- home_score/away_score before this.
alter table public.matches
  add column home_score_ht integer,
  add column away_score_ht integer,
  add column home_corners integer,
  add column away_corners integer,
  add column home_yellow_cards integer,
  add column away_yellow_cards integer;

-- New auto-verified market types this data unlocks: half-time result and
-- half-time total goals (from the two score_ht columns above), corners and
-- cards over/under (from the four stat columns above), plus three
-- event-existence markets read from match_events rather than matches at
-- settlement time (penalty awarded, red card shown, VAR review) — those
-- need no new matches columns, the events are already captured.
alter table public.rooms drop constraint rooms_market_type_check;
alter table public.rooms add constraint rooms_market_type_check
  check (market_type in (
    'winner', 'total_goals', 'both_score', 'correct_score', 'handicap',
    'halftime_result', 'halftime_total_goals', 'corners', 'cards',
    'penalty', 'red_card', 'var',
    'custom'
  ));
