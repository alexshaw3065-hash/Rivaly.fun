import { epochDay, openSession, TxLineError } from "./client";
import type { TxLineFixture } from "./types";

// Structural, not SupabaseClient: the worker has its own copy of
// @supabase/supabase-js, whose class wouldn't match the app's (same reason as
// ScoresDb in apply-scores.ts and Db in bigballs/sync.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from(table: string): any };

// How far back to look. Fixtures that kicked off in the last few days still
// matter: their scores are what settles a room, and a finished match needs to
// exist as a row before the scores sync can attach results to it.
const LOOKBACK_DAYS = 3;

// PostgREST handles large upserts fine, but chunking keeps a single failure
// from discarding an entire competition's worth of work.
const CHUNK = 500;

export interface SyncFixturesResult {
  competitions: number;
  fetched: number;
  upserted: number;
  errors: { competitionId: number; message: string }[];
}

// Kept free of the app's "@/" imports so the Render worker can compile and run
// the same code (worker/tsconfig.json) — it holds the TxLINE token, Vercel
// doesn't. The app's route goes through sync-fixtures.ts.

/**
 * Pulls fixtures for every enabled competition and upserts them.
 *
 * Deliberately writes only fixture-level fields. status, scores, last_seq and
 * stats belong to the scores feed, and an upsert that included them would
 * reset a live match back to "scheduled" on the next hourly run.
 */
export async function syncFixturesWith(supabase: Db): Promise<SyncFixturesResult> {
  const { data: comps, error: compsError } = await supabase
    .from("tracked_competitions")
    .select("competition_id, name, sport_id")
    .eq("provider", "txline")
    .eq("enabled", true);
  if (compsError) throw new Error(`could not read tracked_competitions: ${compsError.message}`);

  const session = await openSession();
  const startEpochDay = epochDay() - LOOKBACK_DAYS;

  const result: SyncFixturesResult = { competitions: 0, fetched: 0, upserted: 0, errors: [] };

  for (const comp of comps ?? []) {
    const competitionId = comp.competition_id as number;
    const sportId = comp.sport_id as number;

    let fixtures: TxLineFixture[];
    try {
      fixtures = await session.get<TxLineFixture[]>(
        `/fixtures/snapshot?competitionId=${competitionId}&startEpochDay=${startEpochDay}`,
      );
    } catch (e) {
      const message = e instanceof TxLineError ? e.message : String(e);
      result.errors.push({ competitionId, message });
      continue;
    }

    result.competitions += 1;
    result.fetched += fixtures.length;
    if (fixtures.length === 0) continue;

    // sport_id comes from our own tracked_competitions rather than the wire:
    // the fixtures payload doesn't include it, and we need it to know whether
    // to normalise events as football or NFL.
    const rows = fixtures.map((f) => ({
      provider: "txline",
      provider_fixture_id: f.FixtureId,
      competition_id: f.CompetitionId,
      competition: f.Competition,
      sport_id: sportId,
      home_team: f.Participant1IsHome ? f.Participant1 : f.Participant2,
      away_team: f.Participant1IsHome ? f.Participant2 : f.Participant1,
      home_participant_id: f.Participant1IsHome ? f.Participant1Id : f.Participant2Id,
      away_participant_id: f.Participant1IsHome ? f.Participant2Id : f.Participant1Id,
      kickoff_at: new Date(f.StartTime).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error, count } = await supabase
        .from("matches")
        .upsert(slice, { onConflict: "provider,provider_fixture_id", count: "exact" });
      if (error) {
        result.errors.push({ competitionId, message: `upsert failed: ${error.message}` });
        break;
      }
      result.upserted += count ?? slice.length;
    }
  }

  return result;
}
