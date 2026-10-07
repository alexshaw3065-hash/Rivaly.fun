// Big Balls → Supabase: fixtures (a few times a day) and live scores (only
// for matches with a room on them). Shared by the Render worker and the
// app's cron route; the database client is injected so one copy of this
// logic serves both (same pattern as src/lib/txline/apply-scores.ts).
// Limits, timing and why: docs/plans/match-data-providers.md.

import { bbGet, syncUsage, usedToday } from "./client";
import {
  confirmFinal,
  goalsBetween,
  goalsWithdrawn,
  mapStatus,
  MATCH_WINDOW_MS,
  nextDelay,
  ticksStillNeeded,
  type BbMatch,
  type PendingFinal,
} from "./logic";

// Structural on purpose: the worker installs its own supabase-js, whose
// client type is nominal, so a shared import would give two incompatible
// types for the same class.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Db = { from(table: string): any };

interface Comp {
  competition_id: number;
  name: string;
  provider_code: string;
}

async function comps(db: Db): Promise<Comp[]> {
  const { data, error } = await db
    .from("tracked_competitions")
    .select("competition_id, name, provider_code")
    .eq("provider", "bigballs")
    .eq("enabled", true);
  if (error) throw new Error(`tracked_competitions: ${error.message}`);
  return ((data ?? []) as Comp[]).filter((c) => c.provider_code);
}

// ── Fixtures ─────────────────────────────────────────────────────────

const TWIN_WINDOW_MS = 3 * 3600_000;
const norm = (s: string) => s.trim().toLowerCase();

/** Same two teams, same way round, kicking off within a few hours: the same match. */
function sameFixture(home: string, away: string, kickoff: string, m: BbMatch): boolean {
  return norm(home) === norm(m.home.name) && norm(away) === norm(m.away.name) && Math.abs(+new Date(kickoff) - +new Date(m.kickoff_utc)) <= TWIN_WINDOW_MS;
}

export interface FixturesResult {
  leagues: number;
  fetched: number;
  upserted: number;
  errors: string[];
}

/**
 * Upcoming and recent matches for every enabled league — one call each.
 * Writes fixture facts only (teams, kickoff); status and score belong to the
 * live poller, except postponements/cancellations (so their rooms refund) and
 * results for matches nobody had a room on.
 */
export async function syncFixtures(db: Db, key: string): Promise<FixturesResult> {
  const result: FixturesResult = { leagues: 0, fetched: 0, upserted: 0, errors: [] };
  for (const comp of await comps(db)) {
    let list: BbMatch[];
    try {
      list = await bbGet<BbMatch[]>(`/v1/matches?league=${comp.provider_code}&limit=200`, key);
    } catch (e) {
      result.errors.push(`${comp.provider_code}: ${(e as Error).message}`);
      continue;
    }
    result.leagues += 1;
    let football = list.filter((m) => m.sport === "football" && m.id && m.home?.name && m.away?.name);
    result.fetched += football.length;
    if (football.length === 0) continue;

    // Big Balls sometimes lists one match twice under two ids (and the two
    // can disagree on the score). Keep one row per match — the one already
    // stored, else the first seen — and remember the twin's id on it, so the
    // live poller can compare them before anyone is paid.
    const kicks = football.map((m) => +new Date(m.kickoff_utc));
    const { data: storedRows } = await db
      .from("matches")
      .select("id, provider_ref, home_team, away_team, kickoff_at, alt_provider_refs")
      .eq("provider", "bigballs")
      .eq("competition_id", comp.competition_id)
      .gte("kickoff_at", new Date(Math.min(...kicks) - TWIN_WINDOW_MS).toISOString())
      .lte("kickoff_at", new Date(Math.max(...kicks) + TWIN_WINDOW_MS).toISOString());
    const stored = (storedRows ?? []) as { id: string; provider_ref: string; home_team: string; away_team: string; kickoff_at: string; alt_provider_refs: string[] | null }[];
    const storedRefs = new Set(stored.map((s) => s.provider_ref));
    const kept: BbMatch[] = [];
    for (const m of football) {
      if (storedRefs.has(m.id)) {
        kept.push(m);
        continue;
      }
      const twinRow = stored.find((s) => sameFixture(s.home_team, s.away_team, s.kickoff_at, m));
      if (twinRow) {
        const alts = twinRow.alt_provider_refs ?? [];
        if (!alts.includes(m.id)) {
          await db.from("matches").update({ alt_provider_refs: [...alts, m.id] }).eq("id", twinRow.id);
          twinRow.alt_provider_refs = [...alts, m.id];
        }
        continue;
      }
      if (kept.some((k) => sameFixture(k.home.name, k.away.name, k.kickoff_utc, m))) continue; // twin in this same response: the first one wins
      kept.push(m);
    }
    football = kept;

    const rows = football.map((m) => ({
      provider: "bigballs",
      provider_ref: m.id,
      competition_id: comp.competition_id,
      competition: comp.name,
      sport_id: 1,
      home_team: m.home.name,
      away_team: m.away.name,
      kickoff_at: new Date(m.kickoff_utc).toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error, count } = await db.from("matches").upsert(rows, { onConflict: "provider,provider_ref", count: "exact" });
    if (error) {
      result.errors.push(`${comp.provider_code}: upsert ${error.message}`);
      continue;
    }
    result.upserted += count ?? rows.length;

    // Postponed / cancelled: say so, so rooms on them void and refund.
    for (const m of football.filter((x) => x.status === "postponed" || x.status === "cancelled")) {
      await db.from("matches").update({ status: m.status, updated_at: new Date().toISOString() }).eq("provider", "bigballs").eq("provider_ref", m.id).neq("status", "finished");
    }

    // Results for matches with no room: no money rides on them, so no need
    // to wait out the live poller's confirmation.
    const finished = football.filter((x) => x.status === "finished" && x.score?.home != null && x.score?.away != null);
    if (finished.length > 0) {
      const { data: ours } = await db
        .from("matches")
        .select("id, provider_ref")
        .eq("provider", "bigballs")
        .neq("status", "finished")
        .in("provider_ref", finished.map((m) => m.id));
      const ids = ((ours ?? []) as { id: string; provider_ref: string }[]);
      if (ids.length > 0) {
        const { data: roomed } = await db.from("rooms").select("match_id").in("match_id", ids.map((r) => r.id));
        const withRooms = new Set(((roomed ?? []) as { match_id: string }[]).map((r) => r.match_id));
        for (const row of ids.filter((r) => !withRooms.has(r.id))) {
          const m = finished.find((x) => x.id === row.provider_ref)!;
          await db.from("matches").update({ status: "finished", home_score: m.score!.home, away_score: m.score!.away, updated_at: new Date().toISOString() }).eq("id", row.id);
        }
      }
    }
  }
  return result;
}

// ── Live ─────────────────────────────────────────────────────────────

interface HotMatch {
  id: string;
  provider_ref: string;
  /** The provider's other ids for this same match (see syncFixtures). */
  alt_provider_refs: string[] | null;
  competition_id: number;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface LiveResult {
  polled: number;
  calls: number;
  goals: number;
  confirmedFinals: number;
  /** When to poll again. */
  delayMs: number;
  errors: string[];
}

// Full-time sightings waiting out the confirmation window. In memory: a
// restart only means waiting the window again, never paying early.
const pendingFinals = new Map<string, PendingFinal>();

const IDLE_MS = 5 * 60_000;
const LOOKAHEAD_MS = 2 * 60_000;

/**
 * One live pass: every match with a room that's kicking off or under way,
 * grouped so one call covers each league's day. Goals come from score
 * changes; full time only counts once it has held (logic.ts confirmFinal).
 */
export async function pollLive(db: Db, key: string, now = Date.now()): Promise<LiveResult> {
  const out: LiveResult = { polled: 0, calls: 0, goals: 0, confirmedFinals: 0, delayMs: IDLE_MS, errors: [] };
  const endOfDay = Date.parse(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z") + 86_400_000;

  const { data: candidates, error } = await db
    .from("matches")
    .select("id, provider_ref, alt_provider_refs, competition_id, kickoff_at, status, home_score, away_score")
    .eq("provider", "bigballs")
    .in("status", ["scheduled", "live"])
    .lte("kickoff_at", new Date(endOfDay).toISOString())
    .gte("kickoff_at", new Date(now - MATCH_WINDOW_MS - 3 * 3600_000).toISOString());
  if (error) throw new Error(`matches: ${error.message}`);
  const today = (candidates ?? []) as HotMatch[];
  if (today.length === 0) return out;

  // Only matches with money on them are polled live.
  const { data: roomed } = await db.from("rooms").select("match_id").in("status", ["open", "live"]).in("match_id", today.map((m) => m.id));
  const withRooms = new Set(((roomed ?? []) as { match_id: string }[]).map((r) => r.match_id));
  const moneyToday = today.filter((m) => withRooms.has(m.id));
  if (moneyToday.length === 0) return out;

  const codeOf = new Map((await comps(db)).map((c) => [c.competition_id, c.provider_code]));
  const groupOf = (m: HotMatch) => `${codeOf.get(Number(m.competition_id))}:${m.kickoff_at.slice(0, 10)}`;
  const due = moneyToday.filter((m) => +new Date(m.kickoff_at) - LOOKAHEAD_MS <= now);

  if (due.length > 0) {
    await syncUsage(key).catch(() => undefined);
    const groups = new Map<string, HotMatch[]>();
    for (const m of due) {
      if (!codeOf.get(Number(m.competition_id))) continue;
      const g = groupOf(m);
      groups.set(g, [...(groups.get(g) ?? []), m]);
    }
    for (const [group, ours] of groups) {
      const [code, date] = group.split(":");
      let list: BbMatch[];
      try {
        list = await bbGet<BbMatch[]>(`/v1/matches?league=${code}&date=${date}&limit=200`, key);
        out.calls += 1;
      } catch (e) {
        out.errors.push(`${group}: ${(e as Error).message}`);
        continue;
      }
      const byRef = new Map(list.map((m) => [m.id, m]));
      for (const match of ours) {
        const seen = byRef.get(match.provider_ref);
        if (!seen) continue;
        out.polled += 1;
        const twins = (match.alt_provider_refs ?? []).map((ref) => byRef.get(ref)).filter((t): t is BbMatch => Boolean(t));
        const r = await applyLive(db, match, seen, now, twins);
        out.goals += r.goals;
        if (r.confirmed) out.confirmedFinals += 1;
      }
    }
  }

  // Pace the next poll against what's left of the day.
  const stillOpen = moneyToday.filter((m) => m.status !== "finished");
  const ticksNeeded = ticksStillNeeded(
    stillOpen.map((m) => ({ group: groupOf(m), kickoff: +new Date(m.kickoff_at) })),
    now,
    endOfDay,
  );
  const urgent = due.some((m) => now - +new Date(m.kickoff_at) > 75 * 60_000);
  const nextKickoff = Math.min(...stillOpen.map((m) => +new Date(m.kickoff_at)).filter((t) => t > now), Infinity);
  out.delayMs =
    due.length > 0
      ? nextDelay({ usedToday: usedToday(), ticksNeeded, urgent })
      : // Nothing under way: sleep until just before the next kickoff (checked at least every 5 min).
        Math.max(30_000, Math.min(IDLE_MS, nextKickoff - LOOKAHEAD_MS - now));
  return out;
}

async function applyLive(db: Db, match: HotMatch, seen: BbMatch, now: number, twins: BbMatch[] = []): Promise<{ goals: number; confirmed: boolean }> {
  const status = mapStatus(seen.status);
  const nowIso = new Date(now).toISOString();
  let goals = 0;

  if (status === "postponed" || status === "cancelled") {
    await db.from("matches").update({ status, updated_at: nowIso }).eq("id", match.id).neq("status", "finished");
    return { goals, confirmed: false };
  }

  const prev = { home: match.home_score ?? 0, away: match.away_score ?? 0 };
  const hasScore = seen.score?.home != null && seen.score?.away != null;
  const next = hasScore ? { home: seen.score!.home!, away: seen.score!.away! } : prev;

  if (status === "live" || status === "finished") {
    const events: Record<string, unknown>[] = [];
    if (match.status === "scheduled") {
      events.push({ match_id: match.id, provider_seq: 0, action: "kickoff", payload: { _eid: 0, source: "bigballs" }, occurred_at: nowIso });
    }
    for (const g of goalsBetween(prev, next)) {
      events.push({
        match_id: match.id,
        provider_seq: g.seq,
        action: "goal",
        participant: g.side === "home" ? 1 : 2,
        payload: { _eid: g.seq, _home: g.home, _away: g.away, _side: g.side, source: "bigballs" },
        occurred_at: nowIso,
      });
      goals += 1;
    }
    for (const n of goalsWithdrawn(prev, next)) {
      events.push({ match_id: match.id, provider_seq: 1000 + n, action: "action_discarded", payload: { _eid: n, source: "bigballs" }, occurred_at: nowIso });
    }
    if (events.length > 0) {
      // A goal given again after being taken back: its old withdrawal no longer stands.
      const regiven = events.filter((e) => e.action === "goal").map((e) => 1000 + (e.provider_seq as number));
      if (regiven.length > 0) await db.from("match_events").delete().eq("match_id", match.id).eq("action", "action_discarded").in("provider_seq", regiven);
      await db.from("match_events").upsert(events, { onConflict: "match_id,provider_seq,action", ignoreDuplicates: false });
    }
    const changed = next.home !== prev.home || next.away !== prev.away || match.home_score === null;
    if (changed || match.status === "scheduled") {
      await db
        .from("matches")
        .update({ home_score: next.home, away_score: next.away, status: "live", updated_at: nowIso })
        .eq("id", match.id)
        .neq("status", "finished");
    }
  }

  const decision = confirmFinal(pendingFinals.get(match.id), { status: seen.status, home: seen.score?.home ?? null, away: seen.score?.away ?? null }, now);
  if (decision.pending) pendingFinals.set(match.id, decision.pending);
  else pendingFinals.delete(match.id);
  if (!decision.confirmed) return { goals, confirmed: false };

  // The provider's twin record of this match must agree before anyone is
  // paid. Still going on the twin: wait (up to 4 h after kickoff, then trust
  // this one). A different final score: hold every room and flag it.
  const disagree = twins.find((t) => mapStatus(t.status) === "finished" && t.score?.home != null && t.score?.away != null && (t.score.home !== next.home || t.score.away !== next.away));
  const twinPending = twins.some((t) => mapStatus(t.status) === "live" || mapStatus(t.status) === "scheduled");
  if (disagree) {
    // Flag once (the poller keeps seeing it until the match leaves its window).
    const { data: flagged } = await db
      .from("matches")
      .update({ score_disputed: true, home_score: next.home, away_score: next.away, updated_at: nowIso })
      .eq("id", match.id)
      .eq("score_disputed", false)
      .select("id");
    if ((flagged ?? []).length > 0) await db.from("platform_events").insert({
      type: "MATCH_SCORE_DISPUTED",
      match_id: match.id,
      source: "worker",
      status: "failed",
      metadata: { ours: `${next.home}-${next.away}`, twin: `${disagree.score!.home}-${disagree.score!.away}`, twin_ref: disagree.id },
    });
    pendingFinals.delete(match.id);
    return { goals, confirmed: false };
  }
  if (twinPending && now - +new Date(match.kickoff_at) < 4 * 3600_000) return { goals, confirmed: false };

  pendingFinals.delete(match.id);
  await db.from("match_events").upsert(
    [{ match_id: match.id, provider_seq: 9999, action: "game_finalised", payload: { _eid: 9999, _home: next.home, _away: next.away, source: "bigballs" }, occurred_at: nowIso }],
    { onConflict: "match_id,provider_seq,action", ignoreDuplicates: false },
  );
  await db.from("matches").update({ status: "finished", home_score: next.home, away_score: next.away, updated_at: nowIso }).eq("id", match.id);
  return { goals, confirmed: true };
}
