-- NFL stats the new NFL markets settle on, read from TxLINE's NFL Score
-- object — verified against a real finished Chiefs v Colts snapshot, which
-- carries {Score, Touchdown, FieldGoal, 1ptConversion} per participant at
-- Q1-Q4, HT, OT and Total. Half-time points reuse home_score_ht /
-- away_score_ht (same HT period, points instead of goals). went_to_overtime
-- is null until known: true once an OT period appears, false only after the
-- final whistle with none.
alter table public.matches
  add column home_touchdowns integer,
  add column away_touchdowns integer,
  add column home_field_goals integer,
  add column away_field_goals integer,
  add column went_to_overtime boolean;

alter table public.rooms drop constraint rooms_market_type_check;
alter table public.rooms add constraint rooms_market_type_check
  check (market_type in (
    'winner', 'total_goals', 'both_score', 'correct_score', 'handicap',
    'halftime_result', 'halftime_total_goals', 'halftime_correct_score', 'second_half_total_goals',
    'corners', 'cards', 'penalty', 'red_card', 'var', 'anytime_scorer',
    'total_points', 'team_points', 'first_half_points', 'total_touchdowns', 'total_field_goals', 'overtime',
    'custom'
  ));
