import { normalizeEvents, normalizeMatch } from "./normalize";
import type { TxLineScores } from "./types";

// The Supabase client is injected rather than imported so this single copy
// serves both callers: the scheduled route in the Next app (which uses
// src/lib/supabase/admin.ts) and the standalone SSE worker (which builds its
// own client outside Next). Without this, the write logic — and the ordering
// and idempotency rules baked into it — would exist twice and drift.
//
// Typed structurally rather than as SupabaseClient on purpose. The worker
// installs its own copy of @supabase/supabase-js, and SupabaseClient has a
// protected member, which makes it nominal — so two installs produce two
// incompatible types for what is the same class. Describing only the surface
// used here sidesteps that entirely.
type DbError = { message: string } | null;

interface Filtered extends PromiseLike<{ error: DbError }> {
  neq(column: string, value: string): Filtered;
}

export interface ScoresDb {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): Filtered;
    };
    upsert(
      values: Record<string, unknown>[],
      options: { onConflict: string; ignoreDuplicates: boolean },
    ): {
      select(columns: string): PromiseLike<{ data: { id: string }[] | null; error: DbError }>;
    };
  };
}

export interface MatchRef {
  id: string;
  sport_id: number;
}

export interface ApplyResult {
  updated: boolean;
  eventsInserted: number;
}

/**
 * Write normalised state and events for one fixture.
 *
 * Safe to call repeatedly with overlapping data: the match row is a plain
 * update, and events upsert against (match_id, provider_seq, action). That
 * matters because the SSE stream has no resume, so every reconnect re-reads
 * a snapshot that overlaps whatever was already stored. A re-read record
 * overwrites its stored row (same provider record, so same facts) — which is
 * how rows stored before the event id and clock were kept pick them up.
 */
export async function applyScores(
  supabase: ScoresDb,
  match: MatchRef,
  records: TxLineScores[],
): Promise<ApplyResult> {
  const state = normalizeMatch(records, match.sport_id);
  if (!state) return { updated: false, eventsInserted: 0 };

  // Only what these records actually establish. The live stream hands us one
  // record at a time, and most (a throw-in, a possession change) say nothing
  // about the score — writing their nulls blanked the scoreboard and sent
  // live matches back to "scheduled".
  const fields: Record<string, unknown> = {
    home_score: state.homeScore,
    away_score: state.awayScore,
    home_score_ht: state.homeScoreHt,
    away_score_ht: state.awayScoreHt,
    home_corners: state.homeCorners,
    away_corners: state.awayCorners,
    home_yellow_cards: state.homeYellowCards,
    away_yellow_cards: state.awayYellowCards,
    home_red_cards: state.homeRedCards,
    away_red_cards: state.awayRedCards,
    home_touchdowns: state.homeTouchdowns,
    away_touchdowns: state.awayTouchdowns,
    home_field_goals: state.homeFieldGoals,
    away_field_goals: state.awayFieldGoals,
    went_to_overtime: state.wentToOvertime,
  };
  const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
  // The match row only changes when something on it did. Every write wakes
  // every open room (RoomLive re-renders on it), so a possession change
  // mustn't cost a page refresh for everyone watching.
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("matches")
      .update({
        ...patch,
        last_seq: state.lastSeq,
        provider_status_id: state.providerStatusId,
        ...(state.stats && Object.keys(state.stats).length > 0 ? { stats: state.stats } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    if (error) throw new Error(`match update failed: ${error.message}`);
  }
  // Status only moves forward: scheduled -> live -> finished. A late record
  // (an amend after the whistle) can't reopen a finished match, and writing
  // the status it already has is skipped so it doesn't wake every room.
  if (state.status === "finished" || state.status === "live") {
    const q = supabase.from("matches").update({ status: state.status, updated_at: new Date().toISOString() }).eq("id", match.id);
    const { error } = await (state.status === "live" ? q.neq("status", "finished").neq("status", "live") : q.neq("status", "finished"));
    if (error) throw new Error(`match status update failed: ${error.message}`);
  }

  const events = normalizeEvents(records, match.sport_id);
  if (events.length === 0) return { updated: true, eventsInserted: 0 };

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
      { onConflict: "match_id,provider_seq,action", ignoreDuplicates: false },
    )
    .select("id");
  if (eventsError) throw new Error(`events upsert failed: ${eventsError.message}`);

  return { updated: true, eventsInserted: inserted?.length ?? 0 };
}
