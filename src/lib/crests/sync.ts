// Server-only. Fetches real team and league badges from TheSportsDB, once
// per team: resized to a 128px WebP (as-is, never altered), stored in our
// own public `crests` bucket with a year-long cache, recorded in `crests`.
// New teams are picked up automatically (cron: /api/cron/sync-crests, every
// hour from the Render worker). Names that can't be matched with certainty
// go to `crest_misses` — a wrong crest is worse than the monogram.

import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { aliasFor, crestKey, pickCandidate, searchVariants, type Candidate } from "./key";

const API = "https://www.thesportsdb.com/api/v1/json/123";
// Free tier: 30 requests a minute. One every 2.1s stays under it.
const SPACING_MS = 2100;
const RETRY_MISS_DAYS = 7;
const SIZE = 128;

const SPORTS: Record<number, string> = { 1: "Soccer", 6: "American Football" };

// Our competition names → TheSportsDB league ids (checked 2026-09-27).
const LEAGUES: Record<string, string> = {
  "premier league": "4328",
  "la liga": "4335",
  bundesliga: "4331",
  "serie a": "4332",
  "ligue 1": "4334",
  mls: "4346",
  "champions league": "4480",
  nfl: "4391",
  friendlies: "4562",
};

// The same competitions as TheSportsDB names them on a team's record — a
// non-exact match must play in one of them (see pickCandidate). Friendlies
// has no entry: national sides aren't filed under it.
const LEAGUE_NAMES: Record<string, string> = {
  "premier league": "English Premier League",
  "la liga": "Spanish La Liga",
  bundesliga: "German Bundesliga",
  "serie a": "Italian Serie A",
  "ligue 1": "French Ligue 1",
  mls: "American Major League Soccer",
  "champions league": "UEFA Champions League",
  nfl: "NFL",
};

// Teams the free search can't reach (it returns one result, and for these
// it's another sport's team) — looked up by TheSportsDB id instead.
const TEAM_IDS: Record<string, string> = {
  "nottingham forest": "133720",
};

let lastCall = 0;
// When the current pass must finish by (set in syncCrests).
let deadline = Infinity;
async function tsdb<T>(path: string): Promise<T | null> {
  const wait = lastCall + SPACING_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  let res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
  if (res.status === 429) {
    // Their limit resets after a minute; hammering only extends it. Wait it
    // out once if this pass has the time, otherwise stop — the next pass continues.
    if (Date.now() + 61_000 > deadline) throw new Error("rate_limited");
    await new Promise((r) => setTimeout(r, 61_000));
    lastCall = Date.now();
    res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
    if (res.status === 429) throw new Error("rate_limited");
  }
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

type RawTeam = {
  idTeam: string;
  strTeam: string;
  strTeamAlternate: string | null;
  strTeamShort: string | null;
  strSport: string;
  strGender: string | null;
  strBadge: string | null;
} & Partial<Record<"strLeague" | "strLeague2" | "strLeague3" | "strLeague4" | "strLeague5" | "strLeague6" | "strLeague7", string | null>>;

const toCandidate = (t: RawTeam): Candidate => ({
  id: t.idTeam,
  name: t.strTeam,
  alternates: (t.strTeamAlternate ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  short: t.strTeamShort,
  sport: t.strSport,
  gender: t.strGender,
  badge: t.strBadge,
  leagues: [t.strLeague, t.strLeague2, t.strLeague3, t.strLeague4, t.strLeague5, t.strLeague6, t.strLeague7].filter((l): l is string => Boolean(l)),
});

/** Downloads, resizes (contain, transparent) and stores one badge. Returns its bucket path. */
async function storeBadge(kind: "team" | "league", sourceId: string, badgeUrl: string): Promise<string> {
  const stem = badgeUrl.split("/").pop()!.replace(/\.[a-z]+$/i, "");
  // TheSportsDB serves a 250px rendition at /small — plenty for 128px, a fraction of the original.
  let res = await fetch(`${badgeUrl}/small`);
  if (!res.ok) res = await fetch(badgeUrl);
  if (!res.ok) throw new Error(`badge ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(input)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  // The file name carries the badge's own version, so a URL never changes content — cache it forever.
  const path = `${kind}/${sourceId}-${stem}.webp`;
  const { error } = await createAdminClient().storage.from("crests").upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

async function miss(kind: "team" | "league", name: string, sportId: number | null, reason: string) {
  const db = createAdminClient();
  const key = crestKey(name);
  const { data } = await db.from("crest_misses").select("attempts").eq("kind", kind).eq("name_key", key).maybeSingle();
  await db.from("crest_misses").upsert({
    kind,
    name_key: key,
    name,
    sport_id: sportId,
    reason,
    attempts: (data?.attempts ?? 0) + 1,
    tried_at: new Date().toISOString(),
  });
}

async function save(kind: "team" | "league", name: string, sportId: number | null, path: string, sourceId: string, sourceName: string) {
  const db = createAdminClient();
  const key = crestKey(name);
  await db.from("crests").upsert({ kind, name_key: key, sport_id: sportId, path, source_id: sourceId, source_name: sourceName, updated_at: new Date().toISOString() });
  await db.from("crest_misses").delete().eq("kind", kind).eq("name_key", key);
}

async function matchTeam(name: string, sportId: number, competitions: string[]): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sport = SPORTS[sportId];
  if (!sport) return { ok: false, reason: "sport not covered" };
  const knownId = TEAM_IDS[crestKey(name)];
  if (knownId) {
    const json = await tsdb<{ teams: RawTeam[] | null }>(`/lookupteam.php?id=${knownId}`);
    const team = json?.teams?.[0];
    if (team?.strBadge && team.strSport === sport) {
      const path = await storeBadge("team", team.idTeam, team.strBadge);
      await save("team", name, sportId, path, team.idTeam, team.strTeam);
      return { ok: true };
    }
  }
  // Any competition we can't name on TheSportsDB (friendlies) switches the league check off.
  const mapped = competitions.map((c) => LEAGUE_NAMES[crestKey(c)]);
  const leagues = mapped.every(Boolean) ? (mapped as string[]) : null;
  const alias = aliasFor(name);
  const names = alias ? [name, alias] : [name];
  for (const q of searchVariants(name)) {
    const json = await tsdb<{ teams: RawTeam[] | null }>(`/searchteams.php?t=${encodeURIComponent(q)}`);
    const pick = pickCandidate(names, sport, (json?.teams ?? []).map(toCandidate), leagues);
    if (pick?.badge) {
      const path = await storeBadge("team", pick.id, pick.badge);
      await save("team", name, sportId, path, pick.id, pick.name);
      return { ok: true };
    }
  }
  return { ok: false, reason: "no certain match" };
}

async function matchLeague(name: string, sportId: number | null): Promise<{ ok: true } | { ok: false; reason: string }> {
  const id = LEAGUES[crestKey(name)];
  if (!id) return { ok: false, reason: "league not mapped" };
  const json = await tsdb<{ leagues: { idLeague: string; strLeague: string; strBadge: string | null }[] | null }>(`/lookupleague.php?id=${id}`);
  const league = json?.leagues?.[0];
  if (!league?.strBadge) return { ok: false, reason: "no badge" };
  const path = await storeBadge("league", league.idLeague, league.strBadge);
  await save("league", name, sportId, path, league.idLeague, league.strLeague);
  return { ok: true };
}

export interface CrestSyncResult {
  added: number;
  missed: number;
  remaining: number;
  stopped: string | null;
}

/**
 * One pass: every team and competition in recent/upcoming matches that has
 * no crest yet (and wasn't a miss in the last week), until the time budget
 * runs out. Safe to run as often as you like; the next pass continues.
 */
export async function syncCrests(budgetMs = 50_000): Promise<CrestSyncResult> {
  const started = Date.now();
  deadline = started + budgetMs;
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: matches }, { data: have }, { data: misses }] = await Promise.all([
    db.from("matches").select("home_team, away_team, competition, sport_id").gte("kickoff_at", since).limit(5000),
    db.from("crests").select("kind, name_key"),
    db.from("crest_misses").select("kind, name_key, tried_at"),
  ]);
  const done = new Set((have ?? []).map((c) => `${c.kind}:${c.name_key}`));
  const retryAfter = Date.now() - RETRY_MISS_DAYS * 86_400_000;
  for (const m of misses ?? []) if (new Date(m.tried_at).getTime() > retryAfter) done.add(`${m.kind}:${m.name_key}`);

  const todo = new Map<string, { kind: "team" | "league"; name: string; sportId: number | null; competitions: Set<string> }>();
  for (const m of matches ?? []) {
    const add = (kind: "team" | "league", name: string | null) => {
      if (!name) return;
      const id = `${kind}:${crestKey(name)}`;
      if (done.has(id)) return;
      const item = todo.get(id) ?? { kind, name, sportId: m.sport_id ?? null, competitions: new Set<string>() };
      if (m.competition) item.competitions.add(m.competition);
      todo.set(id, item);
    };
    add("league", m.competition);
    add("team", m.home_team);
    add("team", m.away_team);
  }

  let added = 0;
  let missed = 0;
  let stopped: string | null = null;
  const queue = [...todo.values()].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "league" ? -1 : 1));
  for (const item of queue) {
    if (Date.now() - started > budgetMs) {
      stopped = "time budget";
      break;
    }
    try {
      const r = item.kind === "league" ? await matchLeague(item.name, item.sportId) : await matchTeam(item.name, item.sportId ?? 1, [...item.competitions]);
      if (r.ok) added++;
      else {
        missed++;
        await miss(item.kind, item.name, item.sportId, r.reason);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "rate_limited") {
        stopped = "rate limited";
        break;
      }
      missed++;
      await miss(item.kind, item.name, item.sportId, e instanceof Error ? e.message.slice(0, 120) : "error");
    }
  }
  return { added, missed, remaining: Math.max(0, queue.length - added - missed), stopped };
}
