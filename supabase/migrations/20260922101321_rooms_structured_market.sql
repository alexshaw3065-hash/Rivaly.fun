-- Structured, verifiable markets for rooms — see the create-room-flow plan.
-- Additive only: every existing row (including the seeded mock-adjacent
-- demo rooms) keeps working unchanged via the defaults below, which are
-- exactly what those rooms already are today — a free-text claim only a
-- human can resolve.
--
-- market_side_definition's shape deliberately mirrors TxLINE's own
-- TraderPredicate/StatTerm ({stat, comparison, threshold}), confirmed
-- against the real on-chain IDL during the TxLINE integration work, so a
-- later on-chain-settlement effort has a straight path in without another
-- migration. Wiring that CPI is a separate effort — this column just avoids
-- foreclosing it.
alter table public.rooms
  add column market_type text not null default 'custom'
    check (market_type in ('winner', 'total_goals', 'both_score', 'custom')),
  add column market_line numeric,
  add column market_side_definition jsonb,
  add column settlement_mode text not null default 'creator_confirms'
    check (settlement_mode in ('auto', 'creator_confirms'));

comment on column public.rooms.market_type is
  'winner | total_goals | both_score = Tier 1, auto-verified from matches.home_score/away_score. custom = Tier 3, creator confirms the result after the match.';
comment on column public.rooms.market_line is
  'Threshold for market types that need one, e.g. 2.5 for total_goals. Null for winner/both_score/custom.';
comment on column public.rooms.market_side_definition is
  'Structured shape of what "Yes" resolves to, e.g. {"stat":"total_goals","comparison":"over","threshold":2.5}. Null for custom rooms.';
comment on column public.rooms.settlement_mode is
  'auto = settled by reading real match data, no human step. creator_confirms = the room creator confirms the outcome after the match. Drives the "Resolves via ___" copy shown before anyone enters.';
