-- Post-match team statistics for Big Balls leagues (UCL, La Liga, Bundesliga,
-- Serie A, Ligue 1, MLS): shots, on target, possession, corners, fouls,
-- offsides, cards, saves, passes, one per team. Fetched once after full time
-- (src/lib/bigballs/extras.ts) and shown on the room's Stats tab.
alter table public.matches add column if not exists box_score jsonb;
