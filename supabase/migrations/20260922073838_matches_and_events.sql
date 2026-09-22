-- Real fixtures, scores and match events, replacing mock-data.ts's static
-- matches. Deliberately provider-agnostic: TxLINE supplies fixtures for every
-- competition free but only serves SCORES for a small bundle (verified
-- empirically: Premier League #8, NFL #500001, MLS #33, Friendlies #430 —
-- everything else 403s), so a second provider will fill the gaps later. The
-- provider columns are what make that a new row rather than a refactor.
--
-- Written only by the server-side ingester (service role). Readable by
-- everyone including anon, because fixtures and scores are public information
-- and the app already renders matches to signed-out visitors.

-- Which competitions we ingest, and what we're actually entitled to read.
-- A table rather than a constant so enabling a league is a data change.
create table public.tracked_competitions (
  provider text not null default 'txline',
  competition_id bigint not null,
  name text not null,
  -- TxLINE sport ids: 1 = soccer, 3 = basketball, 6 = US football
  sport_id integer not null,
  -- False for competitions whose fixtures we can list but whose scores are
  -- bundle-gated. Lets the ingester skip score polling it knows will 403.
  scores_available boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider, competition_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'txline',
  provider_fixture_id bigint not null,

  competition_id bigint not null,
  competition text not null,
  sport_id integer not null,

  home_team text not null,
  away_team text not null,
  home_participant_id bigint,
  away_participant_id bigint,

  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  -- The provider's raw status. GameState proved unreliable in testing (it
  -- still read "scheduled" for matches finished two days earlier), so
  -- StatusId is what `status` above is derived from.
  provider_status_id integer,

  home_score integer,
  away_score integer,

  -- The provider's per-fixture sequence number. Must be stored verbatim:
  -- the on-chain stat-validation endpoint requires the real seq, and
  -- synthetic values are explicitly rejected.
  last_seq integer,
  -- Raw provider stat map (keys are period_prefix + base_key, e.g. 3001 =
  -- team 1 second-half goals). Kept whole so new markets don't need a
  -- migration to read a stat we didn't think to model.
  stats jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_fixture_id)
);

create index matches_status_kickoff_idx on public.matches (status, kickoff_at);
create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_competition_idx on public.matches (competition_id, kickoff_at desc);

-- Discrete in-match events. This is what the "loud moments" treatment needs
-- (goals, penalties, VAR, red cards) — a scoreline alone can't express a goal
-- that VAR then overturns.
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  provider_seq integer not null,
  -- Provider action name: goal, var, var_end, yellow_card, red_card,
  -- penalty, substitution, corner, kickoff, game_finalised, …
  action text not null,
  minute integer,
  -- 1 or 2, matching the provider's participant numbering
  participant integer,
  player_id bigint,
  payload jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Idempotency: the ingester re-reads snapshots after every reconnect
  -- (the stream has no Last-Event-ID), so replays must be harmless.
  unique (match_id, provider_seq, action)
);

create index match_events_match_idx on public.match_events (match_id, occurred_at desc);

alter table public.tracked_competitions enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;

-- Read-only to every client, including anon. No insert/update/delete policies
-- at all, so only the service-role ingester can write — clients must never be
-- able to invent a fixture or a score once rooms hold money.
create policy "tracked_competitions_public_read" on public.tracked_competitions
  for select using (true);
create policy "matches_public_read" on public.matches
  for select using (true);
create policy "match_events_public_read" on public.match_events
  for select using (true);

-- Push changes to connected clients instead of having them poll. One
-- ingester fans out to any number of users this way.
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_events;

-- The competitions the free TxLINE tier actually serves scores for, verified
-- by probing each one rather than trusting the documented bundle.
insert into public.tracked_competitions (competition_id, name, sport_id, scores_available) values
  (8,      'Premier League', 1, true),
  (33,     'MLS',            1, true),
  (430,    'Friendlies',     1, true),
  (500001, 'NFL',            6, true);
