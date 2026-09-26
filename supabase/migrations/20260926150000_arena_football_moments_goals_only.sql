-- Moments: football shows only goals and full time (founder's call,
-- 2026-09-26) — penalties, red cards and VAR decisions no longer get a card.
-- NFL keeps touchdowns, field goals and full time.
create or replace function public.arena_moments(p_match uuid default null)
returns table (id uuid, match_id uuid, action text, minute int, at timestamptz, payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with raw as (
    select me.*, coalesce(me.payload->>'_eid', me.id::text) as eid
    from match_events me
    where me.action in ('goal', 'game_finalised', 'touchdown', 'field_goal')
      and (p_match is null or me.match_id = p_match)
      and not exists (
        select 1 from match_events d
        where d.match_id = me.match_id and d.action = 'action_discarded' and d.payload->>'_eid' = me.payload->>'_eid')
  ),
  grouped as (
    select r.match_id, r.action, r.eid,
      (array_agg(r.id order by r.provider_seq))[1] as id,
      min(coalesce(r.occurred_at, r.created_at)) as at,
      (array_agg(r.minute order by r.provider_seq desc) filter (where r.minute is not null))[1] as minute,
      (array_agg(r.payload->'_home' order by r.provider_seq desc) filter (where r.payload ? '_home'))[1] as home,
      (array_agg(r.payload->'_away' order by r.provider_seq desc) filter (where r.payload ? '_away'))[1] as away,
      (array_agg(r.payload->'_side' order by r.provider_seq desc) filter (where r.payload ? '_side'))[1] as side,
      (array_agg(r.payload->'PlayerId' order by r.provider_seq desc) filter (where r.payload ? 'PlayerId'))[1] as player,
      (array_agg(r.payload->>'Outcome' order by r.provider_seq desc) filter (where r.payload ? 'Outcome'))[1] as outcome,
      (array_agg(coalesce(r.payload->'Type', r.payload->'GoalType') order by r.provider_seq desc)
        filter (where r.payload ? 'Type' or r.payload ? 'GoalType'))[1] as kind
    from raw r
    group by r.match_id, r.action, r.eid
  ),
  kept as (
    select g.*, twin.player as twin_player, twin.kind as twin_kind
    from grouped g
    left join lateral (
      select t.player, t.kind from grouped t
      where t.match_id = g.match_id and t.action = g.action and t.home is null and t.eid <> g.eid
        and abs(extract(epoch from t.at - g.at)) < 180
      order by abs(extract(epoch from t.at - g.at))
      limit 1
    ) twin on true
    where g.home is not null
      and (g.action <> 'field_goal' or coalesce(g.outcome, 'successful') = 'successful')
  ),
  scored as (
    select k.id,
      lag(k.home) over w as prev_home,
      lag(k.away) over w as prev_away
    from kept k
    where k.home is not null and k.action in ('goal', 'touchdown', 'field_goal')
    window w as (partition by k.match_id order by k.at)
  )
  select k.id, k.match_id, k.action, k.minute, k.at,
    jsonb_strip_nulls(jsonb_build_object(
      'home', k.home, 'away', k.away, 'side', k.side, 'outcome', k.outcome,
      'playerId', coalesce(k.player, k.twin_player),
      'type', coalesce(k.kind, k.twin_kind),
      'prevHome', case when s.id is not null then coalesce(s.prev_home, '0'::jsonb) end,
      'prevAway', case when s.id is not null then coalesce(s.prev_away, '0'::jsonb) end))
  from kept k
  left join scored s on s.id = k.id;
$$;
revoke execute on function public.arena_moments(uuid) from anon, authenticated, public;

create or replace function public.arena_reactions_target_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_kind = 'post' and not exists (select 1 from posts where id = new.target_id) then
    raise exception 'reaction_target_missing';
  elsif new.target_kind = 'moment' and not exists (
    select 1 from match_events where id = new.target_id
      and action in ('goal', 'game_finalised', 'touchdown', 'field_goal')
  ) then
    raise exception 'reaction_target_missing';
  elsif new.target_kind = 'entry' and not exists (
    select 1 from entries e join rooms r on r.id = e.room_id where e.id = new.target_id and r.visibility = 'public'
  ) then
    raise exception 'reaction_target_missing';
  end if;
  return new;
end;
$$;
revoke execute on function public.arena_reactions_target_check() from anon, authenticated, public;
