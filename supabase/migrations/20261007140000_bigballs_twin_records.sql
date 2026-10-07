-- Big Balls sometimes lists one match twice (two ids, sometimes different
-- scores: Chicago Fire v Vancouver 2026-10-07 was 3-1 on one, 2-1 on the
-- other). We keep one row per match (the first we stored) and remember the
-- twin's id, so the live poller can compare them before paying out:
--   alt_provider_refs — the provider's other ids for this same match;
--   score_disputed    — the ids disagree on the final score; rooms hold until
--                       an admin settles the score (then clear the flag).
alter table public.matches
  add column if not exists alt_provider_refs text[] not null default '{}',
  add column if not exists score_disputed boolean not null default false;

-- Fold the existing twins: keep the oldest row of each group, record the
-- others' ids on it, and remove the others (none has a room).
with groups as (
  select id, provider_ref, created_at,
    first_value(id) over w as keep_id,
    row_number() over w as n
  from public.matches
  where provider = 'bigballs'
  window w as (partition by competition_id, lower(home_team), lower(away_team), date_trunc('hour', kickoff_at) order by created_at, id)
),
dupes as (
  select g.* from groups g
  where g.n > 1 and not exists (select 1 from public.rooms r where r.match_id = g.id::text)
),
folded as (
  update public.matches m set alt_provider_refs = (
    select array_agg(distinct d.provider_ref) from dupes d where d.keep_id = m.id
  )
  where m.id in (select keep_id from dupes)
  returning m.id
)
delete from public.matches m where m.id in (select id from dupes);
