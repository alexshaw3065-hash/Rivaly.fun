import { createAdminClient } from "@/lib/supabase/admin";
import { openSession, TxLineError } from "./client";
import { normalizeEvents, normalizeMatch } from "./normalize";
import type { TxLineScores } from "./types";

// Only fixtures near "now" are worth polling. Anything older is settled and
// won't change; anything further out hasn't started.
const PAST_HOURS = 30;
const FUTURE_HOURS = 4;

// A wider window is occasionally needed — backfilling results after adding a
// competition, or repairing a gap after an outage. Capped so an over-wide
// request can't turn one run into thousands of provider calls.
const MAX_PAST_HOURS = 24 * 14;

// Don't re-poll matches already recorded as finished — their scores are final.
const ACTIVE_STATUSES = ["scheduled", "live"];

// Keeps a single run bounded so a scheduled invocation can't run away.
const MAX_FIXTURES_PER_RUN = 60;

export interface SyncScoresResult {
  considered: number;
  updated: number;
  eventsInserted: number;
  skippedNoData: number;
  errors: { fixtureId: number; message: string }[];
}

/**
 * Brings match state and events up to date from the scores snapshots.
 *
 * This is the correctness path — it's what makes a finished match show a real
 * result. The SSE worker will handle liveness, but it reuses this same
 * normaliser, and this remains the backstop that repairs anything the stream
 * missed while disconnected.
 */
export async function syncScores(options: { pastHours?: number } = {}): Promise<SyncScoresResult> {
  const pastHours = Math.min(Math.max(options.pastHours ?? PAST_HOURS, 1), MAX_PAST_HOURS);
  const supabase = createAdminClient();
  const result: SyncScoresResult = {
    considered: 0,
    updated: 0,
    eventsInserted: 0,
    skippedNoData: 0,
    errors: [],
  };

  // Only competitions we're actually entitled to read scores for — polling a
  // gated one just earns a 403 per fixture.
  const { data: comps } = await supabase
    .from("tracked_competitions")
    .select("competition_id")
    .eq("enabled", true)
    .eq("scores_available", true);
  const allowed = (comps ?? []).map((c) => c.competition_id as number);
  if (allowed.length === 0) return result;

  const now = Date.now();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, provider_fixture_id, sport_id, status")
    .in("competition_id", allowed)
    .in("status", ACTIVE_STATUSES)
    .gte("kickoff_at", new Date(now - pastHours * 3600_000).toISOString())
    .lte("kickoff_at", new Date(now + FUTURE_HOURS * 3600_000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(MAX_FIXTURES_PER_RUN);
  if (error) throw new Error(`could not read matches: ${error.message}`);

  const session = await openSession();

  for (const match of matches ?? []) {
    result.considered += 1;
    const fixtureId = match.provider_fixture_id as number;
    const sportId = match.sport_id as number;

    let records: TxLineScores[];
    try {
      records = await session.get<TxLineScores[]>(`/scores/snapshot/${fixtureId}`);
    } catch (e) {
      result.errors.push({ fixtureId, message: e instanceof TxLineError ? e.message : String(e) });
      continue;
    }

    const state = normalizeMatch(records, sportId);
    if (!state) {
      // A scheduled fixture with no records yet is the normal pre-match case.
      result.skippedNoData += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: state.status,
        home_score: state.homeScore,
        away_score: state.awayScore,
        last_seq: state.lastSeq,
        provider_status_id: state.providerStatusId,
        stats: state.stats,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    if (updateError) {
      result.errors.push({ fixtureId, message: `update failed: ${updateError.message}` });
      continue;
    }
    result.updated += 1;

    const events = normalizeEvents(records, sportId);
    if (events.length === 0) continue;

    // ignoreDuplicates makes repeated snapshots harmless, which matters
    // because every SSE reconnect will re-read one.
    const { data: inserted, error: eventsError } = await supabase
      .from("match_events")
      .upsert(
        events.map((e) => ({
          match_id: match.id,
          provider_seq: e.providerSeq,
          action: e.action,
          minute: e.minute,
          participant: e.participant,
          player_id: e.playerId,
          payload: e.payload,
          occurred_at: e.occurredAt,
        })),
        { onConflict: "match_id,provider_seq,action", ignoreDuplicates: true },
      )
      .select("id");
    if (eventsError) {
      result.errors.push({ fixtureId, message: `events failed: ${eventsError.message}` });
      continue;
    }
    result.eventsInserted += inserted?.length ?? 0;
  }

  return result;
}
