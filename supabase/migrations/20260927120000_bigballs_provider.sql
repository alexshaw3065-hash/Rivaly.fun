-- Big Balls Data: the one provider for UCL, La Liga, Bundesliga, Serie A,
-- Ligue 1 and MLS (founder decision 2026-09-27 — Big Balls only, no second
-- provider). TxLINE keeps the Premier League and the NFL.
-- Plan: docs/plans/match-data-providers.md.

-- Big Balls identifies matches by UUID, not a number.
alter table public.matches alter column provider_fixture_id drop not null;
alter table public.matches add column if not exists provider_ref text;
create unique index if not exists matches_provider_ref_key on public.matches (provider, provider_ref);
alter table public.matches add constraint matches_provider_id_present
  check (provider_fixture_id is not null or provider_ref is not null) not valid;
alter table public.matches validate constraint matches_provider_id_present;

-- The provider's own league code (?league=ucl), so the poller knows what to ask for.
alter table public.tracked_competitions add column if not exists provider_code text;

-- Synthetic competition ids in their own range (TxLINE's are small numbers).
-- scores_available stays false until the Render worker is confirmed polling:
-- until then these matches are not offered in Create Room, so no room can be
-- made on a match nobody is scoring.
insert into public.tracked_competitions (provider, competition_id, name, sport_id, scores_available, enabled, provider_code) values
  ('bigballs', 900001, 'Champions League', 1, false, true, 'ucl'),
  ('bigballs', 900002, 'La Liga', 1, false, true, 'laliga'),
  ('bigballs', 900003, 'Bundesliga', 1, false, true, 'bundesliga'),
  ('bigballs', 900004, 'Serie A', 1, false, true, 'seriea'),
  ('bigballs', 900005, 'Ligue 1', 1, false, true, 'ligue1'),
  ('bigballs', 900006, 'MLS', 1, false, true, 'mls')
on conflict (provider, competition_id) do nothing;
